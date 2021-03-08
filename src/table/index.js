import 'prosemirror-view/style/prosemirror.css'
import 'prosemirror-menu/style/menu.css'
import 'prosemirror-example-setup/style/style.css'
import 'prosemirror-tables/style/tables.css'
import 'prosemirror-gapcursor/style/gapcursor.css'

import '../7-tables.css'


import {EditorView} from "prosemirror-view"
import {EditorState, TextSelection} from "prosemirror-state"
import {DOMParser, Schema}  from "prosemirror-model"
/**
 * element
 */
import createElement from '../utils/create-element'

// const content = createElement(`
// <h2>Example content</h2>
// <img src="https://xiawei.cc/images/avatar2.jpg" alt="" />
// <p>The table:</p>
// <table class="table_prosemirror">
//   <tr><td>One</td><td>Two</td><td>Three</td></tr>
//   <tr><td>Four</td><td>Five</td><td>Six</td></tr>
//   <tr><td></td><td></td><td></td></tr>
// </table>
// `)

const content = createElement(`
<h2>Example content</h2>
<img src="https://xiawei.cc/images/avatar2.jpg" alt="" />
<p>The table:</p>
<table class="table_prosemirror">
  <colgroup>
    <col>
    <col>
    <col>
  </colgroup>
  <tbody>
    <tr><td>One</td><td>Two</td><td>Three</td></tr>
    <tr><td>Four</td><td>Five</td><td>Six</td></tr>
    <tr><td></td><td></td><td></td></tr>
  </tbody>
</table>
`)

/**
 * schema
 */
import {schema as baseSchema} from "./schema-basic"
import {tableNodes} from '../prosemirror-tables/src'

let schema = new Schema({
  nodes: baseSchema.spec.nodes.append(tableNodes({
    tableGroup: "block",
    cellContent: "block+",
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

import {tableEditing, columnResizing, fixTables} from '../prosemirror-tables/src'
// import {schema} from './schema'

import {dropCursor} from 'prosemirror-dropcursor'
import {gapCursor} from 'prosemirror-gapcursor'
import {keymap}  from "prosemirror-keymap"
import {baseKeymap} from "prosemirror-commands"
import {undo, redo, history} from "prosemirror-history"

let doc = DOMParser.fromSchema(schema).parse(content)
const state = EditorState.create({
  doc,
  plugins: [
    dropCursor(),
    gapCursor(),
    columnResizing(),
    tableEditing(),
    history(),
    keymap(baseKeymap),
    keymap({"Mod-z": undo, "Mod-y": redo}),
    keymap({
      "Tab": goToNextCell(1),
      "Shift-Tab": goToNextCell(-1)
    }),
  ]
})
// let fix = fixTables(state)
// if (fix) state = state.apply(fix.setMeta("addToHistory", false))

const view = new EditorView(document.querySelector("#editor"), {state})
window.view = view


import {
  addColumnAfter,
  addColumnBefore,
  deleteColumn,
  addRowAfter,
  addRowBefore,
  deleteRow,
  mergeCells,
  splitCell,
  setCellAttr,
  toggleHeaderRow,
  toggleHeaderColumn,
  toggleHeaderCell,
  goToNextCell,
  deleteTable,
} from '../prosemirror-tables/src/commands'

import { createTable } from '../tiptap-utils/src'

const {dispatch} = view

function addTable (state, dispatch, { rowsCount, colsCount, withHeaderRow }, ) {
  const offset = state.tr.selection.anchor + 1

  const nodes = createTable(state.schema, rowsCount, colsCount, withHeaderRow)
  const tr = state.tr.replaceSelectionWith(nodes).scrollIntoView()
  const resolvedPos = tr.doc.resolve(offset)

  tr.setSelection(TextSelection.near(resolvedPos))

  dispatch(tr)
}

function addTableToEnd (state, dispatch, { rowsCount, colsCount, withHeaderRow }, ) {
  let tr = state.tr

  // get block end position
  const end = tr.selection.$head.end(1) // param 1 is node deep
  const resolvedEnd = tr.doc.resolve(end)

  // move cursor to the end, then insert table
  const nodes = createTable(state.schema, rowsCount, colsCount, withHeaderRow)
  tr.setSelection(TextSelection.near(resolvedEnd))
  tr = tr.replaceSelectionWith(nodes).scrollIntoView()

  // move cursor into table
  const offset = end + 1
  const resolvedPos = tr.doc.resolve(offset)
  tr.setSelection(TextSelection.near(resolvedPos))

  dispatch(tr)
}

window.commands = {
  getEndPos: () => getEndPos(view.state, dispatch),
  addTableToEnd: (rowsCount = 3, colsCount = 3, withHeaderRow) => addTableToEnd(view.state, dispatch, { rowsCount, colsCount, withHeaderRow }),
  addTable: (rowsCount = 3, colsCount = 3, withHeaderRow) => addTable(view.state, dispatch, { rowsCount, colsCount, withHeaderRow }),
  deleteTable: () => deleteTable(view.state, dispatch),

  addColumnBefore: () => addColumnBefore (view.state, dispatch),
  addColumnAfter: () => addColumnAfter(view.state, dispatch),
  deleteColumn: () => deleteColumn(view.state, dispatch),

  addRowBefore: () => addRowBefore(view.state, dispatch),
  addRowAfter: () => addRowAfter(view.state, dispatch),
  deleteRow: () => deleteRow(view.state, dispatch),

  mergeCells: () => mergeCells(view.state, dispatch),
  splitCell: () => splitCell(view.state, dispatch),

  setCellAttr: () => setCellAttr(name, value),
  toggleHeaderRow: () => toggleHeaderRow(view.state, dispatch),
  toggleHeaderColumn: () => toggleHeaderColumn(view.state, dispatch),
  toggleHeaderCell: () => toggleHeaderCell(view.state, dispatch),
  goToNextCell: () => goToNextCell(1),
  isInTable: () => isInTable(view.state)
}