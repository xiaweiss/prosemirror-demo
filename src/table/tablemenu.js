import {Decoration, DecorationSet} from "prosemirror-view"
import {Plugin, PluginKey} from "prosemirror-state"
import {CellSelection, TableMap, selectedRect} from "../prosemirror-tables/src"
import './tablemenu.css'

export const tablemenuKey = new PluginKey("tablemenu")

export function tablemenu() {
  return new Plugin({
    key: tablemenuKey,

    state: {
      init() { return null },
      apply() { return null }
    },

    view (editorView) {
      return new tableMenuView(editorView)
    }
  })
}

class tableMenuView {
  constructor(view) {
    this.showContextmenu = this.showContextmenu.bind(this)
    this.hideContextmenu = this.hideContextmenu.bind(this)
    this.view = view
    this.init()
  }

  data () {
    const {state} = this.view
    // TODO
    return [
      {'text': '剪切'},
      {'text': '复制'},
      {'text': '粘贴', disabled: true},
      {'text': '清空所选区域'},
      {'hr': true},
      {'text': '剪切'},
      {'text': '剪切'},
      {'text': '向上插入 1 行'},
      {'text': '向下插入 1 行'},
      {'text': '向左插入 1 列'},
      {'text': '向右插入 1 列'},
      {'hr': true},
      {'text': '合并单元格'},
      {'text': '拆分单元格'},
      {'hr': true},
      {'text': '删除选中行'},
      {'text': '删除选中列'}
    ]
  }

  init () {
    this.tablemenu = document.createElement("div")
    this.tablemenu.className = "Prosemirror-tablemenu"
    this.view.dom.parentNode.appendChild(this.tablemenu)

    // 阻止 mousedown 用于判断是否菜单栏外部点击
    this.tablemenu.addEventListener('mousedown', event => {
      event.stopPropagation()
    })
    // 菜单栏外部点击时，隐藏菜单
    document.addEventListener('mousedown', this.hideContextmenu)
    // 打开菜单栏
    document.addEventListener('contextmenu', this.showContextmenu)
  }

  update(view, lastState) {
    this.view = view
  }

  destroy () {
    this.tablemenu.removeEventListener('')
    document.removeEventListener('contextmenu', this.showContextmenu)
    document.removeEventListener('mousedown', this.hideContextmenu)
    this.tablemenu.remove()
  }

  render () {
    const fragment = document.createDocumentFragment()
    const data = this.data()

    data.forEach((item) => {
      const div = document.createElement('div')
      div.classList.add(`Prosemirror-tablemenu-${item.hr ? 'hr' : 'item'}`)
      div.textContent = item.text || ''
      if(item.disabled) div.setAttribute('disabled', '')
      fragment.appendChild(div);
    })

    this.tablemenu.innerHTML = ''
    this.tablemenu.appendChild(fragment)
  }

  updatePosition (event) {
    console.log('getPosition', this.tablemenu.getBoundingClientRect())
    const tablemenuHeight = this.tablemenu.getBoundingClientRect().height
    const windowHeight = window.innerHeight

    this.tablemenu.style.left = `${event.pageX + 1}px`
    this.tablemenu.style.top = `${Math.min(event.pageY - 1, windowHeight - tablemenuHeight)}px`
  }

  showContextmenu (event) {
    const path = event.path || (event.composedPath && event.composedPath())
    for (let i = path.length - 1; i > 0; i--) {
      if (path[i].classList && path[i].classList.contains('ProseMirror-table-wrapper')) {
        event.preventDefault()
        this.render()

        // 先在视口外展示，才能测量元素尺寸、计算位置
        this.tablemenu.style.display = 'block'
        this.updatePosition(event)
        break
      }
    }
  }

  hideContextmenu () {
    this.tablemenu.style.display = 'none'
    this.tablemenu.style.left = ''
    this.tablemenu.style.top = ''
  }
}