import {Decoration, DecorationSet} from "prosemirror-view"
import {Plugin, PluginKey} from "prosemirror-state"
import {CellSelection, TableMap, selectedRect} from "../prosemirror-tables/src"

export const drawCellSelectionKey = new PluginKey("drawCellSelection")

export function drawCellSelection({ allowTableNodeSelection = false } = {}) {
  return new Plugin({
    key: drawCellSelectionKey,

    state: {
      init() { return null },
      apply() { return null }
    },

    props: {
      decorations: (state) => {
        if (!(state.selection instanceof CellSelection)) return null

        console.log('drawCellSelection')

        const cells = []
        const sel = state.selection

        const table = sel.$anchorCell.node(-1)
        const tableStart = sel.$anchorCell.start(-1)
        const tableEnd = tableStart - 1 + table.nodeSize - 1

        const rect = selectedRect(state)
        const {left, top, right, bottom} = rect
        const tableMap = rect.map
        const tableWidth = tableMap.width

        console.log(rect)
        window.rect = rect

        cells.push(Decoration.widget(tableEnd, (view) => {
          let leftPx = 0
          let topPx = 0
          let rightPx = 0
          let bottomPx = 0


          // map row
          for (let row = 0; row < bottom; row++) {
            const pos = tableMap.map[row * tableWidth]
            const cell = table.nodeAt(pos)
            const {height} = view.nodeDOM(tableStart + pos).getBoundingClientRect()

            if (row < top) topPx += height

            bottomPx += height
            row += cell.attrs.rowspan - 1
          }

          // map col
          for (let col = 0; col < right; col++) {
            const pos = tableMap.map[col]
            const cell = table.nodeAt(pos)
            const {width} = view.nodeDOM(tableStart + pos).getBoundingClientRect()

            if (col < left) leftPx += width

            rightPx += width
            col += cell.attrs.colspan - 1
          }


          const widget = document.createElement("div")

          widget.className = 'ProseMirror-widget-drawCellSelection'
          widget.style.width = `${rightPx - leftPx}px`
          widget.style.height = `${bottomPx - topPx}px`
          widget.style.left = `${leftPx}px`
          widget.style.top = `${topPx}px`

          return widget
        }))

        return DecorationSet.create(state.doc, cells)
      },
    },
  })
}