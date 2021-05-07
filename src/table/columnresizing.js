import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {cellAround, pointsAtCell, setAttr} from "../prosemirror-tables/src/util"
import {TableMap} from "../prosemirror-tables/src/tablemap"
import {tableNodeTypes} from "../prosemirror-tables/src/schema"
import {TableView, updateColumns} from "./tableview"

export const key = new PluginKey("tableColumnResizing")

export function columnResizing({ handleWidth = 10, cellMinWidth = 25, View = TableView, lastColumnResizable = true } = {}) {
  return new Plugin({
    key,
    state: {
      init(_, state) {
        this.spec.props.nodeViews[tableNodeTypes(state.schema).table.name] =
          (node, view) => new View(node, cellMinWidth, view)
        return null
      },
      apply(tr, prev) {
        return null
      }
    },
    props: {
      // attributes(state) {
      //   let pluginState = key.getState(state)
      //   return pluginState.activeHandle > -1 ? {class: "resize-cursor"} : null
      // },

      handleDOMEvents: {
        mousemove(view, event) { handleMouseMove(view, event, handleWidth, cellMinWidth) },
        mouseleave(view, event) { handleMouseLeave(view, event, handleWidth, cellMinWidth) },
        mousedown(view, event) { handleMouseDown(view, event, handleWidth, cellMinWidth) },
      },

      decorations(state) {
        return null
      },

      nodeViews: {}
    }
  })
}

let dragging = false
let prevTime = 0
let activeHandle = -1
let startX = 0
let startWidth = 0

function handleMouseMove (view, event, handleWidth, cellMinWidth) {
  if (Date.now() - prevTime < 50) return
  prevTime = Date.now()

  if (!dragging) {
    const target = domCellAround(event.target)
    let cell = -1

    console.log('====mousemove', 'target', target)


    if (target) {
      const {left, right} = target.getBoundingClientRect()

      console.log('====mousemove', 'X', event.clientX)
      console.log('====mousemove', 'left right', left, right)

      // some edge cases, the `clientX` is less than the bounding rect of the target element.
      // For these cases, we should select the cell on the right
      if (event.clientX < left) {
        // console.log('right')
        cell = edgeCell(view, event, "right")

      } else if (event.clientX <= handleWidth + left) {
        // console.log('left')
        cell = edgeCell(view, event, "left")

      } else if (event.clientX >= right - handleWidth) {
        // console.log('right')
        cell = edgeCell(view, event, "right")
      }

      activeHandle = cell

      console.log('cell', cell)

      // if (cell !== -1) {
      //   const $cell = view.state.doc.resolve(cell)
      //   const table = $cell.node(-1), map = TableMap.get(table), start = $cell.start(-1)
      //   const col = map.colCount($cell.pos - start) + $cell.nodeAfter.attrs.colspan - 1
      //   console.log('====mousemove', 'col', col, map.width)
      // }
    }
  }
}

function handleMouseLeave () {
  console.log('====mouseleave')
  dragging = false
}

function handleMouseDown (view, event, handleWidth, cellMinWidth) {
  console.log('====mousedown')
  if (activeHandle == -1) return false

  dragging = true
  startX = event.clientX

  const cell = view.state.doc.nodeAt(activeHandle)
  const width = currentColWidth(view, activeHandle, cell.attrs)
  startWidth = width
  updateColumnWidth(view, activeHandle, width, false)

  function onMouseMove (event) {
    if (dragging) {
      const offset = event.clientX - startX
      const draggedWidth = Math.max(cellMinWidth, startWidth + offset)
      updateColumnWidth(view, activeHandle, draggedWidth, dragging)
    }
  }

  function onMouseup () {
    dragging = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseup)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseup)
}

function handleMouseUp () {
  dragging = false
}

function domCellAround(target) {
  while (target && target.nodeName != "TD" && target.nodeName != "TH")
    target = target.classList.contains("ProseMirror") ? null : target.parentNode
  return target
}

function edgeCell(view, event, side) {
  const found = view.posAtCoords({left: event.clientX, top: event.clientY})
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