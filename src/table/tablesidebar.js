import {Decoration, DecorationSet} from "prosemirror-view"
import {Plugin, PluginKey} from "prosemirror-state"
import {CellSelection, TableMap, selectedRect} from "../prosemirror-tables/src"
import {isInTable, findTableDepth, selectTable, selectRow} from './commands'
import './tablesidebar.css'

export const tablesidebarKey = new PluginKey("tablesidebar")

// TODO: 考虑用 state 来存
let isMouseDown = false
let selectedAnchorRow = -1
let selectedHeadRow = -1

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
    console.log('render tablesidebar')
    debugger
    this.renderWidget()

    return DecorationSet.create(state.doc, this.cells)
  }

  renderWidget () {
    const {tableStart} = this

    // table widget
    this.cells.push(Decoration.widget(tableStart - 1, (view) => {
      const widget = document.createElement("div")
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
    debugger
    const {view, widget, table, tableStart} = this
    const state = this.view.state
    const rect = selectedRect(state)
    const tableMap = rect.map
    const tableWidth = tableMap.width
    const tableDom = view.nodeDOM(tableStart).parentNode.parentNode
    console.log('tableDom', tableDom.getBoundingClientRect().height)

    // select row
    const sidebarRowContainer = this.sidebarRowContainer = widget.appendChild(document.createElement('div'))
    sidebarRowContainer.className = 'ProseMirror-tablesidbar-row-container'
    table

    for (let row = 0; row < tableMap.height; row++) {
      // calculate row height from cell left
      const pos = tableMap.map[row * tableWidth]
      const cell = table.nodeAt(pos)

      // skip merged cells
      row += cell.attrs.rowspan - 1

      const sidebarRow = sidebarRowContainer.appendChild(document.createElement('div'))
      sidebarRow.className = 'ProseMirror-tablesidbar-row'

      this.updateRowHeight(sidebarRow, pos)

      // calc height after prosemirror doc update
      requestAnimationFrame(() => {
        this.updateRowHeight(sidebarRow, pos)
      })

      sidebarRow.addEventListener('mousedown', event => {
        isMouseDown = true
        selectedAnchorRow = row
        selectedHeadRow = row
        selectRow(this.state, this.view.dispatch, selectedAnchorRow)
      })

      sidebarRow.addEventListener('mousemove', event => {
        if (!isMouseDown) return
        if (selectedHeadRow === row) return
        selectedHeadRow = row

        selectRow(this.state, this.view.dispatch, selectedAnchorRow, selectedHeadRow)
      })
    }

    sidebarRowContainer.addEventListener('mouseleave', event => {
      isMouseDown = false
    })

    sidebarRowContainer.addEventListener('mouseup', event => {
      isMouseDown = false
    })
  }

  updateRowHeight (sidebarRow, pos) {
    const {tableStart} = this
    const dom = view.nodeDOM(tableStart + pos)
    // check dom when redo delete table
    const height = dom && dom.getBoundingClientRect ? dom.getBoundingClientRect().height : 0
    if (height > 0) { sidebarRow.style.height = `${height}px` }
  }
}