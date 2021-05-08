import 'prosemirror-view/style/prosemirror.css'
import 'prosemirror-menu/style/menu.css'
import 'prosemirror-example-setup/style/style.css'
import 'prosemirror-tables/style/tables.css'
import 'prosemirror-gapcursor/style/gapcursor.css'

import './7-tables.css'


import {EditorView} from "prosemirror-view"
import {EditorState, TextSelection} from "prosemirror-state"
import {DOMParser, Schema}  from "prosemirror-model"
import {schema as baseSchema}  from "prosemirror-schema-basic"
import {baseKeymap}  from "prosemirror-commands"
import {keymap}  from "prosemirror-keymap"
import {exampleSetup, buildMenuItems}  from "prosemirror-example-setup"
import {MenuItem, Dropdown}  from "prosemirror-menu"
import {keyName} from 'w3c-keyname'


import {addColumnAfter, addColumnBefore, deleteColumn, addRowAfter, addRowBefore, deleteRow,
        mergeCells, splitCell, setCellAttr, toggleHeaderRow, toggleHeaderColumn, toggleHeaderCell,
        goToNextCell, deleteTable}  from "./prosemirror-tables/src/index"
import {tableEditing, columnResizing, tableNodes, fixTables}  from "./prosemirror-tables/src/index"
import {isInTable} from "./prosemirror-tables/src/util"
import createElement from './utils/create-element'

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

let menu = buildMenuItems(schema).fullMenu
function item(label, cmd) { return new MenuItem({label, select: cmd, run: cmd}) }
let tableMenu = [
  item("Insert column before", addColumnBefore),
  item("Insert column after", addColumnAfter),
  item("Delete column", deleteColumn),
  item("Insert row before", addRowBefore),
  item("Insert row after", addRowAfter),
  item("Delete row", deleteRow),
  item("Delete table", deleteTable),
  item("Merge cells", mergeCells),
  item("Split cell", splitCell),
  item("Toggle header column", toggleHeaderColumn),
  item("Toggle header row", toggleHeaderRow),
  item("Toggle header cells", toggleHeaderCell),
  item("Make cell green", setCellAttr("background", "#dfd")),
  item("Make cell not-green", setCellAttr("background", null))
]
menu.splice(2, 0, [new Dropdown(tableMenu, {label: "Table"})])

const content = createElement(`
<h2>Example content</h2>
<img src="https://xiawei.cc/images/avatar2.jpg" alt="" />
<p>The table:</p>
<table>
  <tr><td>One</td><td>Two</td><td>Three</td></tr>
  <tr><td>Four</td><td>Five</td><td>Six</td></tr>
  <tr><td></td><td></td><td></td></tr>
</table>
`)

let doc = DOMParser.fromSchema(schema).parse(content)
const state = EditorState.create({doc, plugins: [
  // columnResizing(),
  // tableEditing(),
  // keymap({
  //   "Tab": goToNextCell(1),
  //   "Shift-Tab": goToNextCell(-1)
  // })
].concat(exampleSetup({schema, menuContent: menu}))})
let fix = fixTables(state)
if (fix) state = state.apply(fix.setMeta("addToHistory", false))

const view = new EditorView(document.querySelector("#editor"), {state})
window.view = view

document.execCommand("enableObjectResizing", false, false)
document.execCommand("enableInlineTableEditing", false, false)

const {dispatch} = view

import {createTable} from './tiptap-utils/src'

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

function addTable (state, dispatch, { rowsCount = 3, colsCount = 3, withHeaderRow = false }) {
  const offset = state.tr.selection.anchor + 1

  const nodes = createTable(state.schema, rowsCount, colsCount, withHeaderRow)
  const tr = state.tr.replaceSelectionWith(nodes).scrollIntoView()
  const resolvedPos = tr.doc.resolve(offset)

  tr.setSelection(TextSelection.near(resolvedPos))

  dispatch(tr)
}

import {
  splitBlock,
  liftEmptyBlock,
  chainCommands,
  newlineInCode,
  createParagraphNear,
  deleteSelection,
  selectParentNode
} from 'prosemirror-commands';

window.commands = {
  addTableToEnd: (rowsCount = 3, colsCount = 3, withHeaderRow) => addTableToEnd(view.state, dispatch, { rowsCount, colsCount, withHeaderRow }),
  addTable: (rowsCount, colsCount, withHeaderRow) => addTable(view.state, dispatch, {rowsCount, colsCount, withHeaderRow}),
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
  isInTable: () => isInTable(view.state),

  selectParentNode: () => selectParentNode(view.state, dispatch),
  deleteSelection: () => deleteSelection(view.state, dispatch),
  splitBlock: () => splitBlock(view.state, dispatch),
  liftEmptyBlock: () => liftEmptyBlock(view.state, dispatch),
  newlineInCode: () => newlineInCode(view.state, dispatch),
  createParagraphNear: () => createParagraphNear(view.state, dispatch)

}

window.addEventListener('keydown', (event) => {
  const name = keyName(event)
  console.log('keydown', name)
  switch (name) {
    case 'a':
      commands.addRowAfter()
      break;
    case 'b':
      commands.addRowBefore()
      break;
    default:
      console.log('isInTable', commands.isInTable())
  }
})
