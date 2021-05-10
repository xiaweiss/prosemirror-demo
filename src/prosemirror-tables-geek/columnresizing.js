import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {cellAround, setAttr, isInTable, setAllColumnWidth} from "./util"
import {TableMap} from './tablemap'
import {tableNodeTypes} from './schema'
import {TableView, updateColumns} from "./tableview"
import './columnResizing.css'

let dragging = false
let prevTime = 0
let activeHandle = -1
let startX = 0
let startWidth = 0

export const key = new PluginKey("tableColumnResizing")

export function columnResizing({ handleWidth = 5, cellMinWidth = 25, View = TableView} = {}) {
  return new Plugin({
    key,
    state: {
      init(_, state) {
        this.spec.props.nodeViews[tableNodeTypes(state.schema).table.name] =
          (node, view) => new View(node, cellMinWidth)
        return null
      },
      apply() {
        return null
      }
    },
    props: {
      attributes() {
        return activeHandle > -1 ? {class: "resize-col-cursor"} : null
      },

      handleDOMEvents: {
        mousemove(view, event) { handleMouseMove(view, event, handleWidth, cellMinWidth) },
        mousedown(view, event) { handleMouseDown(view, event, handleWidth, cellMinWidth) },
      },

      decorations(state) {
        if (activeHandle > -1) return handleDecorations(state, activeHandle)
        return null
      },

      nodeViews: {}
    }
  })
}

function handleMouseMove (view, event, handleWidth, cellMinWidth) {
  if (Date.now() - prevTime < 50) return
  prevTime = Date.now()

  if (!dragging) {
    let target = domCellAround(event.target)
    let table = domTableAround(target)
    let {clientX, clientY} = event
    let cell = -1

    // sidebar
    if (!target && isInTable(view.state)) {
      console.log('sidebar')
      clientY += 10 // sidebar height
      target = domCellAround(document.elementFromPoint(clientX, clientY))
      table = domTableAround(target)

      if (target) {
        function sidebarMousedown (event) {
          handleMouseDown(view, event, handleWidth, cellMinWidth)
        }

        event.target.removeEventListener('mousedown', sidebarMousedown)
        event.target.addEventListener('mousedown', sidebarMousedown)
      }
    }

    if (target) {
      const {left, right} = target.getBoundingClientRect()
      const tableLeft  = table.getBoundingClientRect().left
      const tableRight  = table.getBoundingClientRect().right


      // console.log('X', event.clientX, left, right)

      // some edge cases, the `clientX` is less than the bounding rect of the target element.
      // For these cases, we should select the cell on the right
      if (clientX < left && clientX > tableLeft) {
        cell = edgeCell(view, clientX, clientY, "right")

      // some edge cases, the `clientX` is more than the bounding rect of the target element.
      // For these cases, we should select the cell on the left
      } else if (clientX > right && clientX <= tableRight) {
        cell = edgeCell(view, clientX, clientY, "left")

      } else if (clientX <= handleWidth + left) {
        cell = edgeCell(view, clientX, clientY, "left")

      } else if (clientX >= right - handleWidth) {
        cell = edgeCell(view, clientX, clientY, "right")
      }
    }

    if (cell !== activeHandle) {
      activeHandle = cell
      view.dispatch(view.state.tr)
    }
  }
}

function handleMouseDown (view, event, handleWidth, cellMinWidth) {
  if (activeHandle === -1) return false

  dragging = true
  // when change column width, stop selection
  event.preventDefault()
  startX = event.clientX

  const cell = view.state.doc.nodeAt(activeHandle)
  const width = currentColWidth(view, activeHandle, cell.attrs)
  startWidth = width
  updateColumnWidth(view, activeHandle, width, false)

  function onMouseMove (event) {
    // when change column width, stop selection
    event.preventDefault()
    if (dragging) {
      const offset = event.clientX - startX
      const draggedWidth = Math.max(cellMinWidth, startWidth + offset)
      updateColumnWidth(view, activeHandle, draggedWidth, dragging)
    }
  }

  function onMouseup (event) {
    // when change column width, stop selection
    event.preventDefault()
    dragging = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseup)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseup)
}

function domCellAround(target) {
  while (target && target.nodeName != "TD" && target.nodeName != "TH")
    target = target.classList.contains("ProseMirror") ? null : target.parentNode
  return target
}

function domTableAround(target) {
  while (target && target.nodeName != "TABLE")
    target = target.classList.contains("ProseMirror") ? null : target.parentNode
  return target
}

function edgeCell(view, left, top, side) {
  const found = view.posAtCoords({left, top})
  if (!found) return -1

  const {pos} = found
  const $cell = cellAround(view.state.doc.resolve(pos))
  if (!$cell) return -1

  if (side == "right") return $cell.pos

  const map = TableMap.get($cell.node(-1))
  const start = $cell.start(-1)
  const index = map.map.indexOf($cell.pos - start)
  return index % map.width == 0 ? -1 : start + map.map[index - 1]
}

function currentColWidth(view, cellPos, {colspan, colwidth}) {
  const width = colwidth && colwidth[colwidth.length - 1]
  if (width) return width

  const dom = view.domAtPos(cellPos)
  const node = dom.node.childNodes[dom.offset]
  let domWidth = node.offsetWidth, parts = colspan
  if (colwidth) for (let i = 0; i < colspan; i++) if (colwidth[i]) {
    domWidth -= colwidth[i]
    parts--
  }
  return domWidth / parts
}

function updateColumnWidth(view, cell, width, dragging) {
  let $cell = view.state.doc.resolve(cell)
  let table = $cell.node(-1), map = TableMap.get(table), start = $cell.start(-1)
  let col = map.colCount($cell.pos - start) + $cell.nodeAfter.attrs.colspan - 1
  let tr = view.state.tr
  for (let row = 0; row < map.height; row++) {
    let mapIndex = row * map.width + col
    // Rowspanning cell that has already been handled
    if (row && map.map[mapIndex] == map.map[mapIndex - map.width]) continue
    let pos = map.map[mapIndex], {attrs} = table.nodeAt(pos)
    let index = attrs.colspan == 1 ? 0 : col - map.colCount(pos)
    if (attrs.colwidth && attrs.colwidth[index] == width) continue
    let colwidth = attrs.colwidth ? attrs.colwidth.slice() : zeroes(attrs.colspan)
    colwidth[index] = width
    tr.setNodeMarkup(start + pos, null, setAttr(attrs, "colwidth", colwidth))
    tr.setMeta('replaceHistory', dragging)
  }
  if (tr.docChanged) view.dispatch(tr)
}

function zeroes(n) {
  let result = []
  for (let i = 0; i < n; i++) result.push(0)
  return result
}

function handleDecorations(state, cell) {
  let decorations = []
  let $cell = state.doc.resolve(cell)
  let table = $cell.node(-1), map = TableMap.get(table), start = $cell.start(-1)
  let col = map.colCount($cell.pos - start) + $cell.nodeAfter.attrs.colspan
  for (let row = 0; row < map.height; row++) {
    let index = col + row * map.width - 1
    // For positions that are have either a different cell or the end
    // of the table to their right, and either the top of the table or
    // a different cell above them, add a decoration
    if ((col == map.width || map.map[index] != map.map[index + 1]) &&
        (row == 0 || map.map[index] != map.map[index - map.width])) {
      let cellPos = map.map[index]
      let pos = start + cellPos + table.nodeAt(cellPos).nodeSize - 1
      let dom = document.createElement("div")
      dom.className = "column-resize-handle"
      decorations.push(Decoration.widget(pos, dom))
    }
  }
  return DecorationSet.create(state.doc, decorations)
}