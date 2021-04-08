import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteTable,
  goToNextCell,
  mergeCells,
  selectedRect,
  setCellAttr,
  splitCell,
  toggleHeaderCell,
  toggleHeaderColumn,
  toggleHeaderRow,
} from '../prosemirror-tables/src/commands'

import { isInTable, selectionCell } from '../prosemirror-tables/src/util'
import { TableMap } from '../prosemirror-tables/src/tablemap'
import { CellSelection } from '../prosemirror-tables/src/cellselection'
import { NodeSelection } from 'prosemirror-state'

export function removeRow(tr, {map, table, tableStart}, row) {
  let rowPos = 0
  for (let i = 0; i < row; i++) rowPos += table.child(i).nodeSize
  let nextRow = rowPos + table.child(row).nodeSize

  let mapFrom = tr.mapping.maps.length
  tr.delete(rowPos + tableStart, nextRow + tableStart)

  for (let col = 0, index = row * map.width; col < map.width; col++, index++) {
    let pos = map.map[index]
    if (row > 0 && pos == map.map[index - map.width]) {
      // If this cell starts in the row above, simply reduce its rowspan
      let attrs = table.nodeAt(pos).attrs
      tr.setNodeMarkup(tr.mapping.slice(mapFrom).map(pos + tableStart), null, setAttr(attrs, "rowspan", attrs.rowspan - 1))
      col += attrs.colspan - 1
      index += attrs.colspan - 1
    } else if (row < map.height && pos == map.map[index + map.width]) {
      // Else, if it continues in the row below, it has to be moved down
      let cell = table.nodeAt(pos)
      let copy = cell.type.create(setAttr(cell.attrs, "rowspan", cell.attrs.rowspan - 1), cell.content)
      let newPos = map.positionAt(row + 1, col, table)
      tr.insert(tr.mapping.slice(mapFrom).map(tableStart + newPos), copy)
      col += cell.attrs.colspan - 1
      index += cell.attrs.colspan - 1
    }
  }
}

// :: (EditorState, dispatch: ?(tr: Transaction)) → bool
// Remove the selected rows from a table.
function deleteRow(state, dispatch) {
  if (!isInTable(state)) return false
  if (dispatch) {
    let rect = selectedRect(state), tr = state.tr
    if (rect.top == 0 && rect.bottom == rect.map.height) return false
    for (let i = rect.bottom - 1;; i--) {
      removeRow(tr, rect, i)
      if (i == rect.top) break
      rect.table = rect.tableStart ? tr.doc.nodeAt(rect.tableStart - 1) : tr.doc
      rect.map = TableMap.get(rect.table)
    }
    dispatch(tr)
  }
  return true
}

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

// TODO：处理下个段落无内容 bug
function addTableToEnd (state, dispatch, { rowsCount = 3, colsCount = 3, withHeaderRow, cellContent }, ) {
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

function findTableDepth (state) {
  let $head = state.selection.$head
  for (let d = $head.depth; d > 0; d--) if ($head.node(d).type.spec.tableRole == "table") return d
  return false
}

function selectTable (state, dispatch) {
  if (!isInTable(state)) return false

  const { tr, doc } = state
  const tableDepth = findTableDepth(state)
  const tableStart = state.selection.$anchor.start(tableDepth)

  const selection = NodeSelection.create(doc, tableStart - 1)
  tr.setSelection(selection)
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


export {
  addTable,
  addTableToEnd,
  deleteTable,
  selectTable,
  findTableDepth,

  addColumnBefore,
  addColumnAfter,
  deleteColumn,

  addRowBefore,
  addRowAfter,
  deleteRow,
  selectRow,
  selectCol,

  mergeCells,
  splitCell,

  setCellAttr,
  toggleHeaderRow,
  toggleHeaderColumn,
  toggleHeaderCell,
  goToNextCell,

  isInTable,
  TableMap
}