import Simplebar from 'simplebar'
import 'simplebar/dist/simplebar.css'
import './tableview.css'

export class TableView {
  constructor (node) {
    this.node = node
    this.dom = document.createElement("div")
    this.dom.className = "ProseMirror-table-wrapper"

    this.simplebar = this.dom.appendChild(document.createElement('div'))
    this.simplebar.setAttribute('data-simplebar', '')
    this.simplebar.setAttribute('data-simplebar-auto-hide', false)

    this.table = this.simplebar.appendChild(document.createElement("table"))
    this.colgroup = this.table.appendChild(document.createElement("colgroup"))
    updateColumns(node, this.colgroup, this.table)
    this.contentDOM = this.table.appendChild(document.createElement("tbody"))

    // NOTE: 鼠标右键点击时，阻止 selection，可以保持 CellSelection 不被取消
    this.table.addEventListener('mousedown', event => {
      if (event.button === 2) {
        const path = event.path || (event.composedPath && event.composedPath())

        for (let i = 0 ; i < path.length; i++) {
          if (path[i].classList && path[i].classList.contains('selectedCell')) {
            event.preventDefault()
            return
          }
        }
      }
    })
  }
  update (node) {
    if (node.type != this.node.type) return false
    this.node = node
    updateColumns(node, this.colgroup, this.table)
    return true
  }

  ignoreMutation (record) {
    // console.log('ignoreMutation', record, record.type == "attributes" && record.target.classList.value.indexOf('simplebar') > -1)

    // ignore wrapper
    if (record.target == this.simplebar && (record.type == "attributes" || record.type == "childList")) {
      return true
    }

    // ignore simplebar
    if (record.type == "attributes" && record.target.classList.value.indexOf('simplebar') > -1) {
      return true
    }

    const result = record.type == "attributes" && (record.target == this.table || this.colgroup.contains(record.target))

    return result
  }
}

export function updateColumns (node, colgroup, table, overrideCol, overrideValue) {
  let totalWidth = 0, fixedWidth = true
  let nextDOM = colgroup.firstChild, row = node.firstChild
  for (let i = 0, col = 0; i < row.childCount; i++) {
    const {colspan, colwidth} = row.child(i).attrs
    for (let j = 0; j < colspan; j++, col++) {
      const hasWidth = overrideCol == col ? overrideValue : colwidth && colwidth[j]
      const cssWidth = hasWidth ? hasWidth + "px" : ""

      totalWidth += hasWidth || 0

      if (!hasWidth) fixedWidth = false
      if (!nextDOM) {
        colgroup.appendChild(document.createElement("col")).style.width = cssWidth
      } else {
        if (nextDOM.style.width != cssWidth) nextDOM.style.width = cssWidth
        nextDOM = nextDOM.nextSibling
      }
    }
  }

  while (nextDOM) {
    let after = nextDOM.nextSibling
    nextDOM.parentNode.removeChild(nextDOM)
    nextDOM = after
  }

  if (fixedWidth) {
    table.style.width = totalWidth + "px"
    table.style.minWidth = ""
  } else {
    table.style.width = ""
    table.style.minWidth = totalWidth + "px"
  }
}
