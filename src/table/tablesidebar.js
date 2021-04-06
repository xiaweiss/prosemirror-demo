import {Decoration, DecorationSet} from "prosemirror-view"
import {Plugin, PluginKey} from "prosemirror-state"
import {CellSelection, TableMap, selectedRect} from "../prosemirror-tables/src"
import {isInTable, findTableDepth, selectTable} from './commands'
import './tablesidebar.css'

export const tablesidebarKey = new PluginKey("tablesidebar")

export function tablesidebar() {
  return new Plugin({
    key: tablesidebarKey,

    state: {
      init() { return null },
      apply() { return null }
    },

    props: {
      decorations: (state) => {
        if (!isInTable(state)) return null

        const cells = []
        const sel = state.selection

        const tableDepth = findTableDepth(state)
        const table = sel.$anchor.node(tableDepth)
        const tableStart = sel.$anchor.start(tableDepth)
        const tableEnd = tableStart - 1 + table.nodeSize - 1

        const rect = selectedRect(state)
        const {left, top, right, bottom} = rect
        const tableMap = rect.map
        const tableWidth = tableMap.width

        cells.push(Decoration.widget(tableStart - 1, (view) => {
          const widget = document.createElement("div")
          widget.className = 'ProseMirror-tablesidbar'
          const child = widget.appendChild(document.createElement('div'))
          child.className = 'ProseMirror-tablesidbar-select-all'
          child.addEventListener('click', () => {
            selectTable(state, view.dispatch)
          })
          return widget
        }, {
          // stopEvent: () => true,
          ignoreSelection: true
        }))

        return DecorationSet.create(state.doc, cells)
      },
    },
  })
}