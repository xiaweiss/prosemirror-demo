import 'prosemirror-view/style/prosemirror.css'
import 'prosemirror-gapcursor/style/gapcursor.css'

import {EditorView} from "prosemirror-view"
import {EditorState, Selection, NodeSelection, TextSelection, Node} from "prosemirror-state"
import {DOMParser, Schema}  from "prosemirror-model"
import {deleteSelection} from 'prosemirror-commands'

/**
 * element
 */
import createElement from './utils/create-element'

const content = createElement(`
<h2>Example content</h2>
<img src="https://xiawei.cc/images/avatar2.jpg" alt="" />
<p>The table:</p>
<table class="table_prosemirror">
  <tr><td data-colwidth="100">One</td><td>Two</td><td>Three</td><td></td></tr>
  <tr><td data-colwidth="100">Four</td><td>Five</td><td>Six</td><td></td></tr>
  <tr><td data-colwidth="100"></td><td></td><td></td></tr>
</table>

<p>The table 2:</p>
<table class="table_prosemirror">
  <tr><td>One</td><td>Two</td><td>Three</td><td></td></tr>
  <tr><td>Four</td><td>Five</td><td>Six</td><td></td></tr>
  <tr><td></td><td></td><td></td></tr>
</table>
`)

// const content = createElement(`
// <h2>Example content</h2>
// <img src="https://xiawei.cc/images/avatar2.jpg" alt="" />
// <p>The table:</p>
// <table class="table_prosemirror">
//   <tr><td>0</td><td data-colwidth="100">1</td><td>2</td></tr>
//   <tr><td>3</td><td>4</td><td>5</td></tr>
// </table>
// `)

// const content = createElement(`
// <h2>Example content</h2>
// <img src="https://xiawei.cc/images/avatar2.jpg" alt="" />
// <p>The table:</p>
// <table class="table_prosemirror">
//   <tr><td colspan="2" rowspan="2">One</td><td>Two</td></tr>
//   <tr><td>Three</td></tr>
//   <tr><td></td><td></td></tr>
// </table>
// `)

// const content = createElement(`
// <h2>Example content</h2>
// <img src="https://xiawei.cc/images/avatar2.jpg" alt="" />
// <p>The table:</p>
// <table class="table_prosemirror">
//   <colgroup>
//     <col>
//     <col>
//     <col>
//   </colgroup>
//   <tbody>
//     <tr><td>One</td><td>Two</td><td>Three</td></tr>
//     <tr><td>Four</td><td>Five</td><td>Six</td></tr>
//     <tr><td></td><td></td><td></td></tr>
//   </tbody>
// </table>
// `)

/**
 * schema
 */
import {schema as baseSchema} from "./schema-basic"
import {
  tableNodes,
  CellSelection,
  fixTables,
  columnResizing,
  tableEditing,
  // tableDrawCellSelection,
  tableSidebar,
  tableMenu,

  addTable,
  addTableToEnd,
  deleteTable,
  addColumnAfter,
  addColumnBefore,
  deleteColumn,
  addRowAfter,
  addRowBefore,
  selectRow,
  selectCol,
  deleteRow,
  mergeCells,
  splitCell,
  setCellAttr,
  toggleHeaderRow,
  toggleHeaderColumn,
  toggleHeaderCell,
  goToNextCell,
  isInTable,
  TableMap
} from './prosemirror-tables-geek'

import {tableDrawCellSelection} from './prosemirror-tables-geek/tableDrawCellSelection'

let schema = new Schema({
  nodes: baseSchema.spec.nodes.append(tableNodes({
    tableGroup: "block",
    cellContent: "block+",
    // cellContent: "paragraph+",
    cellAttributes: {
      background: {
        default: null,
        getFromDOM(dom) { return dom.style.backgroundColor || null },
        setDOMAttr(value, attrs) { if (value) attrs.style = (attrs.style || "") + `background-color: ${value};` }
      }
    }
  })),
  marks: baseSchema.spec.marks
})


import {dropCursor} from 'prosemirror-dropcursor'
import {gapCursor} from 'prosemirror-gapcursor'
import {keymap}  from "prosemirror-keymap"
import {baseKeymap} from "prosemirror-commands"
import {undo, redo, history} from "./history"

// let doc = schema.nodeFromJSON(json)
let doc = DOMParser.fromSchema(schema).parse(content)
let state = EditorState.create({
  doc,
  plugins: [
    dropCursor(),
    gapCursor(),
    history(),
    keymap(baseKeymap),
    keymap({"Mod-z": undo, "Mod-y": redo}),
    keymap({
      "Tab": goToNextCell(1),
      "Shift-Tab": goToNextCell(-1)
    }),
    columnResizing(),
    tableEditing(),
    tableDrawCellSelection(),
    tableSidebar(),
    tableMenu()
  ]
})
let fix = fixTables(state)
if (fix) state = state.apply(fix.setMeta("addToHistory", false))

document.execCommand("enableObjectResizing", false, false)
document.execCommand("enableInlineTableEditing", false, false)

const view = new EditorView(document.querySelector("#editor"), {
  state,
  // nodeViews: {
  //   table: (node, view, getPos) => new TableView(node, view, getPos)
  // }
})
window.view = view


// import { createTable } from '../tiptap-utils/src'

const {dispatch} = view

window.commands = {
  addTableToEnd: (rowsCount = 3, colsCount = 3, withHeaderRow) => addTableToEnd(view.state, dispatch, { rowsCount, colsCount, withHeaderRow }),
  addTable: (rowsCount = 3, colsCount = 3, withHeaderRow) => addTable(view.state, dispatch, { rowsCount, colsCount, withHeaderRow }),
  deleteTable: () => deleteTable(view.state, dispatch),

  addColumnBefore: () => addColumnBefore (view.state, dispatch),
  addColumnAfter: () => addColumnAfter(view.state, dispatch),
  deleteColumn: () => deleteColumn(view.state, dispatch),

  addRowBefore: () => addRowBefore(view.state, dispatch),
  addRowAfter: () => addRowAfter(view.state, dispatch),
  deleteRow: () => deleteRow(view.state, dispatch),
  selectRow: (anchorRow, headRow) => selectRow(view.state, dispatch, anchorRow, headRow),
  selectCol: (anchorCol, headCol) => selectCol(view.state, dispatch, anchorCol, headCol),

  mergeCells: () => mergeCells(view.state, dispatch),
  splitCell: () => splitCell(view.state, dispatch),

  setCellAttr: () => setCellAttr(name, value),
  toggleHeaderRow: () => toggleHeaderRow(view.state, dispatch),
  toggleHeaderColumn: () => toggleHeaderColumn(view.state, dispatch),
  toggleHeaderCell: () => toggleHeaderCell(view.state, dispatch),
  goToNextCell: () => goToNextCell(1),
  // test
  isInTable: () => isInTable(view.state),
  TableMap,
  deleteSelection: () => deleteSelection(view.state, dispatch),
}

window.Selection = Selection
window.NodeSelection = NodeSelection
window.TextSelection = TextSelection
window.CellSelection = CellSelection