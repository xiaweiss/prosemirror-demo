// Various helper function for working with tables

import {PluginKey} from "prosemirror-state"

import {TableMap} from "./tablemap"
import {tableNodeTypes} from "./schema";

export const key = new PluginKey("selectingCells")

export function cellAround($pos) {
  for (let d = $pos.depth; d > 0; d--)  // ! Sometimes the cell can be in the same depth.
    if ($pos.node(d).type.spec.tableRole == "row") return $pos.node(0).resolve($pos.before(d + 1))
  return null
}

export function cellWrapping($pos) {
  for (let d = $pos.depth; d > 0; d--) { // Sometimes the cell can be in the same depth.
    const role = $pos.node(d).type.spec.tableRole;
    if (role === "cell" || role === 'header_cell') return $pos.node(d)
  }
  return null
}

export function isInTable(state) {
  let $head = state.selection.$head
  for (let d = $head.depth; d > 0; d--) if ($head.node(d).type.spec.tableRole == "row") return true
  return false
}

export function selectionCell(state) {
  let sel = state.selection
  if (sel.$anchorCell) {
    return sel.$anchorCell.pos > sel.$headCell.pos ? sel.$anchorCell : sel.$headCell;
  } else if (sel.node && sel.node.type.spec.tableRole == "cell") {
    return sel.$anchor
  }
  return cellAround(sel.$head) || cellNear(sel.$head)
}

function cellNear($pos) {
  for (let after = $pos.nodeAfter, pos = $pos.pos; after; after = after.firstChild, pos++) {
    let role = after.type.spec.tableRole
    if (role == "cell" || role == "header_cell") return $pos.doc.resolve(pos)
  }
  for (let before = $pos.nodeBefore, pos = $pos.pos; before; before = before.lastChild, pos--) {
    let role = before.type.spec.tableRole
    if (role == "cell" || role == "header_cell") return $pos.doc.resolve(pos - before.nodeSize)
  }
}

export function pointsAtCell($pos) {
  return $pos.parent.type.spec.tableRole == "row" && $pos.nodeAfter
}

export function moveCellForward($pos) {
  return $pos.node(0).resolve($pos.pos + $pos.nodeAfter.nodeSize)
}

export function inSameTable($a, $b) {
  return $a.depth == $b.depth && $a.pos >= $b.start(-1) && $a.pos <= $b.end(-1)
}

export function findCell($pos) {
  return TableMap.get($pos.node(-1)).findCell($pos.pos - $pos.start(-1))
}

export function colCount($pos) {
  return TableMap.get($pos.node(-1)).colCount($pos.pos - $pos.start(-1))
}

export function nextCell($pos, axis, dir) {
  let start = $pos.start(-1), map = TableMap.get($pos.node(-1))
  let moved = map.nextCell($pos.pos - start, axis, dir)
  return moved == null ? null : $pos.node(0).resolve(start + moved)
}

export function setAttr(attrs, name, value) {
  let result = {}
  for (let prop in attrs) result[prop] = attrs[prop]
  result[name] = value
  return result
}

export function removeColSpan(attrs, pos, n=1) {
  let result = setAttr(attrs, "colspan", attrs.colspan - n)
  if (result.colwidth) {
    result.colwidth = result.colwidth.slice()
    result.colwidth.splice(pos, n)
    if (!result.colwidth.some(w => w > 0)) result.colwidth = null
  }
  return result
}

export function addColSpan(attrs, pos, n=1) {
  let result = setAttr(attrs, "colspan", attrs.colspan + n)
  if (result.colwidth) {
    result.colwidth = result.colwidth.slice()
    for (let i = 0; i < n; i++) result.colwidth.splice(pos, 0, 0)
  }
  return result
}

export function columnIsHeader(map, table, col) {
  let headerCell = tableNodeTypes(table.type.schema).header_cell
  for (let row = 0; row < map.height; row++)
    if (table.nodeAt(map.map[col + row * map.width]).type != headerCell)
      return false
  return true
}

// Helper to get the selected rectangle in a table, if any. Adds table
// map, table node, and table start offset to the object for
// convenience.
export function selectedRect(state) {
  let sel = state.selection, $pos = selectionCell(state)
  let table = $pos.node(-1), tableStart = $pos.start(-1), map = TableMap.get(table)
  let rect
  if (sel instanceof CellSelection)
    rect = map.rectBetween(sel.$anchorCell.pos - tableStart, sel.$headCell.pos - tableStart)
  else
    rect = map.findCell($pos.pos - tableStart)
  rect.tableStart = tableStart
  rect.map = map
  rect.table = table
  return rect
}

function getDomWidth (view, pos) {
  const dom = view.domAtPos(pos)
  const domNode = dom.node.childNodes[dom.offset]
  const domWidth = domNode.offsetWidth
  return domWidth
}

export function currentColWidth(view, cellPos, cellAttrs) {
  const {colspan, colwidth} = cellAttrs || view.state.tr.doc.nodeAt(cellPos).attrs

  if (colwidth) {
    return colwidth
  } else {
    if (colspan === 1) return [getDomWidth(view, cellPos)]

    // merged cell
    const totalWidth = getDomWidth(view, cellPos)
    const $cell = view.state.tr.doc.resolve(cellPos)
    const table = $cell.node(-1)
    const tableStart = $cell.start(-1)
    const map = TableMap.get(table)
    const colStart = map.colCount(cellPos - tableStart)

    // if colspan === 2, default colwidth is [totalWidth, 0]
    const colWidth = new Array(colspan).fill(0)
    colWidth[0] = totalWidth

    for (let col = colStart; col < colStart + colspan; col++) {
      // check every cell of col, get cell width
      let width = Infinity
      for (let row = 0; row < map.height; row++) {
        const mapIndex = row * map.width + col
        const pos = map.map[mapIndex]
        const {attrs} = table.nodeAt(pos)

        width = Math.min(width, getDomWidth(view, tableStart + pos))
        if (attrs.colspan === 1) break
      }

      // add cell width to colWidth
      if (width !== totalWidth) {
        colWidth[col - colStart] = width
      }
    }
    return colWidth
  }
}

export function setAllColumnWidth (tr, view, {map, tableStart, table}) {
  for (let col = 0; col < map.width; col++) {
    // check every cell of col
    for (let row = 0; row < map.height; row++) {
      const mapIndex = row * map.width + col
      const pos = map.map[mapIndex]
      const {attrs} = table.nodeAt(pos)
      if (attrs.colspan === 1 && attrs.colwidth) continue

      const colWidth = currentColWidth(view, tableStart + pos, attrs)
      tr.setNodeMarkup(tableStart + pos, null, setAttr(attrs, "colwidth", colWidth))
    }
  }
  return tr
}
