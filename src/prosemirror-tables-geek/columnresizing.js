import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {cellAround, setAttr, isInTable, setAllColumnWidth, currentColWidth} from "./util"
import {TableMap} from './tablemap'
import './columnResizing.css'

let dragging = false
let prevTime = 0
let activeHandle = -1
let startX = 0
let startWidth = 0

export const key = new PluginKey("tableColumnResizing")

export function columnResizing({ handleWidth = 5, cellMinWidth = 20} = {}) {
  return new Plugin({
    key,
    state: {
      init() {
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
        mousemove(view, event) { handleMouseMove(view, event, cellMinWidth, handleWidth) },
        mousedown(view, event) { handleMouseDown(view, event, cellMinWidth) },
      },

      decorations(state) {
        if (activeHandle > -1) return handleDecorations(state, activeHandle)
        return null
      },

      nodeViews: {}
    }
  })
}

function handleMouseMove (view, event, cellMinWidth, handleWidth) {
  if (Date.now() - prevTime < 50) return
  prevTime = Date.now()

  if (!dragging) {
    let target = domCellAround(event.target)
    let table = domTableAround(target)
    let {clientX, clientY} = event
    let cell = -1

    // sidebar
    if (!target && isInTable(view.state)) {
      clientY += 10 // sidebar height
      target = domCellAround(document.elementFromPoint(clientX, clientY))
      table = domTableAround(target)

      if (target) {
        function sidebarMousedown (event) {
          handleMouseDown(view, event, cellMinWidth)
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

function handleMouseDown (view, event, cellMinWidth) {
  if (activeHandle === -1) return false

  dragging = true
  // when change column width, stop selection
  event.preventDefault()
  startX = event.clientX

  const $cell = view.state.doc.resolve(activeHandle)
  const table = $cell.node(-1), map = TableMap.get(table), tableStart = $cell.start(-1)
  const col = map.colCount($cell.pos - tableStart) + $cell.nodeAfter.attrs.colspan - 1

  const colWidth = currentColWidth(view, activeHandle)
  const width = colWidth[colWidth.length - 1]

  let mousemoveStart = true

  startWidth = width

  function onMouseMove (event) {
    // when change column width, stop selection
    event.preventDefault()
    if (dragging) {
      // NOTE: 这里多设置一次，mousemove 时会覆盖这一条 history
      if (mousemoveStart) {
        const tr = setAllColumnWidth(view.state.tr, view, {map, tableStart, table})
        updateColumnWidth(tr, view, {map, tableStart, table, col}, width, false)
        mousemoveStart = false
      }

      const offset = event.clientX - startX
      const draggedWidth = Math.max(cellMinWidth, startWidth + offset)

      updateColumnWidth(view.state.tr, view, {map, tableStart, table, col}, draggedWidth, true)
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
    // NOTE: when mousemove outside of proseMirror, sometime 'target.classList' is undefined
    target = (target.classList && target.classList.contains("ProseMirror")) ? null : target.parentNode
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

function updateColumnWidth(tr, view, {map, tableStart, table, col}, width, replaceHistory) {
  for (let row = 0; row < map.height; row++) {
    let mapIndex = row * map.width + col
    // Rowspanning cell that has already been handled
    if (row && map.map[mapIndex] == map.map[mapIndex - map.width]) continue
    let pos = map.map[mapIndex], {attrs} = table.nodeAt(pos)
    let index = attrs.colspan == 1 ? 0 : col - map.colCount(pos)
    if (attrs.colwidth && attrs.colwidth[index] == width) continue
    let colwidth = attrs.colwidth ? attrs.colwidth.slice() : zeroes(attrs.colspan)
    colwidth[index] = width
    tr.setNodeMarkup(tableStart + pos, null, setAttr(attrs, "colwidth", colwidth))
    tr.setMeta('replaceHistory', replaceHistory)
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