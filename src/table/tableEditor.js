import {Decoration, DecorationSet} from "prosemirror-view"
import {Plugin, PluginKey} from "prosemirror-state"
import {CellSelection, TableMap} from "../prosemirror-tables/src"

export const tableEditorKey = new PluginKey("tableEditor")

export function tableEditor({ allowTableNodeSelection = false } = {}) {
  return new Plugin({
    key: tableEditorKey,

    state: {
      init() { return null },
      apply() { return null }
    },

    props: {
      decorations: drawCellSelection,

      // handleDOMEvents: {
      //   mousedown: handleMouseDown
      // },
    },
  })
}

function drawWidget(state) {
  // condition
  // if dont show return null

  const widget_1 = Decoration.widget(pos, dom)
  const widget_2 = Decoration.widget(pos, (view, getPos) => { return dom })

  return DecorationSet.create(state.doc, [widget_1, widget_2])

}

function drawCellSelection(state) {
  if (!(state.selection instanceof CellSelection)) return null
  let cells = []
  const sel = state.selection
  const {$anchorCell, $headCell} = sel

  let table = $anchorCell.node(-1)
  let map = TableMap.get(table)
  let start = $anchorCell.start(-1)
  let rect = map.rectBetween($anchorCell.pos - start, $headCell.pos - start)

  window.sel = sel
  window.table = table
  window.map = map
  window.rect = rect

  if (sel.isRowSelection()) {
    let rowStart = start
    cells.push(Decoration.node(start - 1, start - 1 + table.nodeSize, {style: 'background: pink'}))

    let widget = document.createElement("div")
    widget.innerText = 1231231123
    console.log(widget)
    cells.push(Decoration.widget(start, widget))

    // for (let i = 0; i <= rect.bottom - 1; i++) {
    //   let rowEnd = rowStart + table.child(i).nodeSize
    //   cells.push(Decoration.node(rowStart, rowEnd, {class: "selectedRow", style: 'background: pink'}))
    //   rowStart = rowEnd
    // }



  } else if (sel.isColSelection()) {

  }

  state.selection.forEachCell((node, pos) => {
    cells.push()
  })

  return DecorationSet.create(state.doc, cells)
}