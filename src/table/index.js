import 'prosemirror-view/style/prosemirror.css'
import 'prosemirror-menu/style/menu.css'
import 'prosemirror-example-setup/style/style.css'
import 'prosemirror-tables/style/tables.css'
import 'prosemirror-gapcursor/style/gapcursor.css'

import '../7-tables.css'
import './style.css'


import {EditorView} from "prosemirror-view"
import {EditorState, Selection, NodeSelection, TextSelection, Node} from "prosemirror-state"
import {DOMParser, Schema}  from "prosemirror-model"
/**
 * element
 */
import createElement from '../utils/create-element'

const content = createElement(`
<h2>Example content</h2>
<img src="https://xiawei.cc/images/avatar2.jpg" alt="" />
<p>The table:</p>
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
import {tableNodes, CellSelection, selectionCell, TableMap} from '../prosemirror-tables/src'

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

import {
  tableEditing,
  columnResizing,
  fixTables,
  isInTable,
  tableNodeTypes
} from '../prosemirror-tables/src'
// import {schema} from './schema'

import {dropCursor} from 'prosemirror-dropcursor'
import {gapCursor} from 'prosemirror-gapcursor'
import {keymap}  from "prosemirror-keymap"
import {baseKeymap, deleteSelection} from "prosemirror-commands"
import {undo, redo, history} from "prosemirror-history"
import {tableEditor} from './tableEditor'

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
    columnResizing({ cellMinWidth: 80 }),
    tableEditing(),
    tableEditor()
  ]
})
let fix = fixTables(state)
if (fix) state = state.apply(fix.setMeta("addToHistory", false))

document.execCommand("enableObjectResizing", false, false)
document.execCommand("enableInlineTableEditing", false, false)

import {TableView} from './tableview'

const view = new EditorView(document.querySelector("#editor"), {
  state,
  // nodeViews: {
  //   table: (node, view, getPos) => new TableView(node, view, getPos)
  // }
})
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

// import { createTable } from '../tiptap-utils/src'

const {dispatch} = view

function createTable (state, rowsCount, colsCount, withHeaderRow, cellContent) {
  const types = tableNodeTypes(state.schema)
  const headerCells = []
  const cells = []
  const createCell = (cellType, cellContent) => cellContent ? cellType.createChecked(null, cellContent) : cellType.createAndFill()

  for (let index = 0; index < colsCount; index += 1) {
    const cell = createCell(types.cell, cellContent)

    if (cell) {
      cells.push(cell)
    }

    if (withHeaderRow) {
      const headerCell = createCell(types.header_cell, cellContent)

      if (headerCell) {
        headerCells.push(headerCell)
      }
    }
  }

  const rows = []

  for (let index = 0; index < rowsCount; index += 1) {
    rows.push(types.row.createChecked(null, withHeaderRow && index === 0 ? headerCells : cells))
  }

  return types.table.createChecked(null, rows)
}

function addTable (state, dispatch, { rowsCount, colsCount, withHeaderRow, cellContent }, ) {
  const offset = state.tr.selection.anchor + 1

  const nodes = createTable(state, rowsCount, colsCount, withHeaderRow, cellContent)
  const tr = state.tr.replaceSelectionWith(nodes).scrollIntoView()
  const resolvedPos = tr.doc.resolve(offset)

  tr.setSelection(TextSelection.near(resolvedPos))

  dispatch(tr)
}

function addTableToEnd (state, dispatch, { rowsCount, colsCount, withHeaderRow, cellContent }, ) {
  let tr = state.tr

  // get block end position
  const end = tr.selection.$head.end(1) // param 1 is node deep
  const resolvedEnd = tr.doc.resolve(end)

  // move cursor to the end, then insert table
  const nodes = createTable(state, rowsCount, colsCount, withHeaderRow, cellContent)
  tr.setSelection(TextSelection.near(resolvedEnd))
  tr = tr.replaceSelectionWith(nodes).scrollIntoView()

  // move cursor into table
  const offset = end + 1
  const resolvedPos = tr.doc.resolve(offset)
  tr.setSelection(TextSelection.near(resolvedPos))

  dispatch(tr)
}

function selectRow (state, dispatch, anchorRow, headRow = anchorRow) {
  if (!isInTable(state)) return false

  const {tr, doc} = state
  let $anchorCell, $headCell

  // when pararm choice a row num
  if (anchorRow !== undefined) {
    const $pos = selectionCell(state)
    const table = $pos.node(-1)
    const tableStart = $pos.start(-1)
    const map = TableMap.get(table)

    // check anchorRow and headRow in table ranges
    if (!(
      Math.min(anchorRow, headRow) >= 0 &&
      Math.max(anchorRow, headRow) < map.height
    )) return false

    $anchorCell = doc.resolve(tableStart + map.positionAt(anchorRow, 0, table))
    $headCell = anchorRow === headRow ? $anchorCell : doc.resolve(tableStart + map.positionAt(headRow, 0, table))

  // when selected cell
  } else if (state.selection instanceof CellSelection) {
    $anchorCell = state.selection.$anchorCell
    $headCell =  state.selection.$headCell

  // when selected text
  } else {
    $headCell = $anchorCell = selectionCell(state)
  }

  const selection = CellSelection.rowSelection($anchorCell, $headCell)
  tr.setSelection(selection)
  dispatch(tr)
}

function selectCol (state, dispatch, anchorCol, headCol = anchorCol) {
  if (!isInTable(state)) return false

  const {tr, doc} = state
  let $anchorCell, $headCell

  // when pararm choice a col num
  if (anchorCol != undefined) {
    const $pos = selectionCell(state)
    const table = $pos.node(-1)
    const tableStart = $pos.start(-1)
    const map = TableMap.get(table)

    // check anchorCol and headCol in table ranges
    if (anchorCol >= map.width || headCol >= map.width) return false
    if (!(
      Math.min(anchorCol, headCol) >= 0 &&
      Math.max(anchorCol, headCol) < map.width
    )) return false

    $anchorCell = doc.resolve(tableStart + map.positionAt(0, anchorCol, table))
    $headCell = headCol === anchorCol ? $anchorCell : doc.resolve(tableStart + map.positionAt(0, headCol, table))

  // when selected cell
  } else if (state.selection instanceof CellSelection) {
    $anchorCell = state.selection
    $headCell = state.selection

  // when selected text
  } else {
    $headCell = $anchorCell = selectionCell(state)
  }

  const selection = CellSelection.colSelection($anchorCell, $headCell)
  tr.setSelection(selection)
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