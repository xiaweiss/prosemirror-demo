export class TableView {
  constructor(node, view, getPos) {
    debugger
    this.dom = document.createElement("div")
    this.dom.className = "tableContainer"
    this.menu = this.dom.appendChild(document.createElement("div"))
    this.menu.setAttribute('class', 'menu')
    this.menu.innerHTML = 'nemu'

    this.table = this.dom.appendChild(document.createElement("table"))
    this.contentDOM = this.table.appendChild(document.createElement("tbody"))
  }
}