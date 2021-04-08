import {Decoration, DecorationSet} from "prosemirror-view"
import {Plugin, PluginKey} from "prosemirror-state"
import {CellSelection, TableMap} from "../prosemirror-tables/src"
import {isInTable, findTableDepth, selectTable, selectRow, selectCol} from './commands'
import './tablesidebar.css'

export const tablesidebarKey = new PluginKey("tablesidebar")

// TODO: 考虑用 state 来存
let isMouseDown = false

let selectedAnchorRow = -1
let selectedHeadRow = -1

let selectedAnchorCol = -1
let selectedHeadCol = -1

export function tablesidebar() {
  return new Plugin({
    key: tablesidebarKey,

    state: {
      init() { return null },
      apply() { return null }
    },

    props: {
      decorations: (state) => {
        if (!isInTable(state)) {
          isMouseDown = false
          return null
        }

        return new sidebarDecoration(state)
      },
    },
  })
}



class sidebarDecoration {
  constructor(state) {
    const tableDepth = findTableDepth(state)
    const sel = state.selection

    this.cells = []
    this.state = state
    this.selection = state.selection
    this.table = sel.$anchor.node(tableDepth)
    this.tableStart = sel.$anchor.start(tableDepth)
    this.tableEnd = this.tableStart - 1 + this.table.nodeSize - 1
    this.tableMap = TableMap.get(this.table)
    this.rect = sel instanceof CellSelection ? this.tableMap.rectBetween(sel.$anchorCell.pos - this.tableStart, sel.$headCell.pos - this.tableStart) : {}
    this.renderWidget()
    this.renderCol()

    return DecorationSet.create(state.doc, this.cells)
  }

  renderWidget () {
    const {tableStart} = this

    // table widget
    this.cells.push(Decoration.widget(tableStart - 1, (view) => {
      const widget = document.createElement('div')
      widget.className = 'ProseMirror-tablesidbar'
      this.widget = widget
      this.view = view

      this.renderSelectTable()
      this.renderRow()

      return widget
    }, {
      // stop decoration selection
      ignoreSelection: true
    }))
  }

  renderSelectTable () {
    const {state, view, widget} = this
    // select table
    const sidebarSelectTable = widget.appendChild(document.createElement('div'))
    sidebarSelectTable.className = 'ProseMirror-tablesidbar-select-table'
    sidebarSelectTable.addEventListener('click', () => {
      selectTable(state, view.dispatch)
    })
  }

  renderRow () {
    const {view, state, widget, table, tableMap, rect} = this
    const {top, bottom} = rect

    // select row
    const sidebarRowContainer = widget.appendChild(document.createElement('div'))
    sidebarRowContainer.className = 'ProseMirror-tablesidbar-row-container'

    for (let row = 0; row < tableMap.height; row++) {
      // calculate row height from cell left (first col)
      const pos = tableMap.map[row * tableMap.width]
      const cell = table.nodeAt(pos)

      // skip merged cells
      row += cell.attrs.rowspan - 1

      const sidebarRow = sidebarRowContainer.appendChild(document.createElement('div'))
      sidebarRow.className = 'ProseMirror-tablesidbar-row'

      // when selected Cell (cellSelection), sidebar highlight
      if (row >= top && row < bottom) {
        sidebarRow.setAttribute('selected', '')
      } else {
        sidebarRow.removeAttribute('selected')
      }

      this.updateRowHeight(sidebarRow, pos)

      // calc height after prosemirror doc update
      requestAnimationFrame(() => {
        this.updateRowHeight(sidebarRow, pos)
      })

      sidebarRow.addEventListener('mousedown', () => {
        isMouseDown = true
        selectedAnchorRow = row
        selectedHeadRow = row
        selectRow(state, view.dispatch, selectedAnchorRow)
      })

      sidebarRow.addEventListener('mousemove', () => {
        if (!isMouseDown) return
        if (selectedHeadRow === row) return
        selectedHeadRow = row

        selectRow(state, view.dispatch, selectedAnchorRow, selectedHeadRow)
      })
    }

    sidebarRowContainer.addEventListener('mouseleave', () => {
      isMouseDown = false
    })

    sidebarRowContainer.addEventListener('mouseup', () => {
      isMouseDown = false
    })
  }

  renderCol () {
    const {state, table, tableEnd, tableMap, rect} = this
    const {left, right} = rect

    this.cells.push(Decoration.widget(tableEnd, view => {
      const sidebarColContainer = document.createElement('div')
      sidebarColContainer.className = 'ProseMirror-tablesidbar ProseMirror-tablesidbar-col-container'

      for (let col = 0; col < tableMap.width; col++) {
        // calculate col width from cell top (first row)
        const pos = tableMap.map[col]
        const cell = table.nodeAt(pos)

        // skip merged cells
        col += cell.attrs.colspan - 1

        const sidebarCol = sidebarColContainer.appendChild(document.createElement('div'))
        sidebarCol.className = 'ProseMirror-tablesidbar-col'

        // when selected Cell (cellSelection), sidebar highlight
        if (col >= left && col < right) {
          sidebarCol.setAttribute('selected', '')
        } else {
          sidebarCol.removeAttribute('selected')
        }

        this.updateColWidth(sidebarCol, pos)

        requestAnimationFrame(() => {
          this.updateColWidth(sidebarCol, pos)
        })

        sidebarCol.addEventListener('mousedown', () => {
          isMouseDown = true
          selectedAnchorCol = col
          selectedHeadCol = col
          selectCol(state, view.dispatch, selectedAnchorCol)
        })

        sidebarCol.addEventListener('mousemove', () => {
          if (!isMouseDown) return
          if (selectedHeadCol === col) return
          selectedHeadCol = col

          selectCol(state, view.dispatch, selectedAnchorCol, selectedHeadCol)
        })
      }

      sidebarColContainer.addEventListener('mouseleave', () => {
        isMouseDown = false
      })

      sidebarColContainer.addEventListener('mouseup', () => {
        isMouseDown = false
      })

      return sidebarColContainer
    }, {
      // stop decoration selection
      ignoreSelection: true
    }))
  }

  updateRowHeight (sidebarRow, pos) {
    const {view, tableStart} = this
    const dom = view.nodeDOM(tableStart + pos)
    // check dom when redo delete table
    const height = dom && dom.getBoundingClientRect ? dom.getBoundingClientRect().height : 0
    if (height > 0) { sidebarRow.style.height = `${height}px` }
  }

  updateColWidth (sidebarCol, pos) {
    const {view, tableStart} = this
    const dom = view.nodeDOM(tableStart + pos)
    // check dom when redo delete table
    const width = dom && dom.getBoundingClientRect ? dom.getBoundingClientRect().width : 0
    if (width > 0) { sidebarCol.style.width = `${width}px` }
  }
}