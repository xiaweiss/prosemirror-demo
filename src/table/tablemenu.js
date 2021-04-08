import {Decoration, DecorationSet} from "prosemirror-view"
import {Plugin, PluginKey} from "prosemirror-state"
import {CellSelection, TableMap, selectedRect} from "../prosemirror-tables/src"
import './tablemenu.css'

import {
  addRowBefore,
  addRowAfter,
  addColumnBefore,
  addColumnAfter,
  mergeCells,
  splitCell,
  deleteTable,
  deleteRow,
  deleteColumn
} from './commands'
import {cellWrapping} from '../prosemirror-tables/src/util'
import { deleteSelection } from 'prosemirror-commands'

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
    const { state, dispatch } = this.view
    const sel = state.selection

    return [
      {
        text: '剪切',
        command: () => document.execCommand('cut')
      },
      {
        text: '复制',
        command: () => document.execCommand('copy')
      },
      {
        text: '粘贴',
        disabled: true,
        hovertip: '请使用 ⌘+V 粘贴',
        command: () => document.execCommand('insertHTML')
      },
      {
        text: '清空所选区域',
        disabled: !(sel instanceof CellSelection),
        command: () => deleteSelection(state, dispatch)
      },
      { hr: true },
      {
        text: '向上插入 1 行',
        command: () => addRowBefore(state, dispatch)
      },
      {
        text: '向下插入 1 行',
        command: () => addRowAfter(state, dispatch)
      },
      {
        text: '向左插入 1 列',
        command: () => addColumnBefore (state, dispatch)
      },
      {
        text: '向右插入 1 列',
        command: () => addColumnAfter(state, dispatch)
      },
      { hr: true },
      {
        text: '合并单元格',
        disabled: !(sel instanceof CellSelection) || sel.$anchorCell.pos === sel.$headCell.pos,
        command: () => mergeCells(state, dispatch)
      },
      {
        text: '拆分单元格',
        disabled: function () {
          let cellNode
          if (sel instanceof CellSelection) {
            if (sel.$anchorCell.pos != sel.$headCell.pos) return true
            cellNode = sel.$anchorCell.nodeAfter
          } else {
            cellNode = cellWrapping(sel.$from)
            if (!cellNode) return true
          }
          if (cellNode.attrs.colspan == 1 && cellNode.attrs.rowspan == 1) {return true}
          return false
        }(),
        command: () => splitCell(state, dispatch)
      },
      { hr: true },
      {
        text: '删除选中行',
        command: () => deleteRow(state, dispatch)
      },
      {
        text: '删除选中列',
        command: () => deleteColumn(state, dispatch)
      },
      { hr: true },
      {
        text: '删除表格',
        command: () => deleteTable(state, dispatch)
      },
    ]
  }

  init () {
    this.tablemenu = document.createElement("div")
    this.tablemenu.className = "Prosemirror-tablemenu"
    this.view.dom.parentNode.appendChild(this.tablemenu)

    this.tablemenu.addEventListener('mousedown', event => {
      // 阻止 mousedown 默认行为，避免点击菜单时编辑器 blur
      event.preventDefault()
      // 阻止 mousedown 冒泡，用于判断是否菜单栏外部点击
      event.stopPropagation()
    })
    // 菜单栏外部点击时，隐藏菜单
    document.addEventListener('mousedown', this.hideContextmenu)
    // 打开菜单栏
    document.addEventListener('contextmenu', this.showContextmenu)
  }

  update(view, prevState) {
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

      if (item.disabled) {
        div.setAttribute('disabled', '')
      } else {
        div.addEventListener('click', (event) => {
          item.command()
          this.hideContextmenu()
        })
      }

      if(item.hovertip) {
        const hoverDiv = div.appendChild(document.createElement('div'))
        hoverDiv.classList.add('Prosemirror-tablemenu-item-hovertip')
        hoverDiv.textContent = item.hovertip
      }
      fragment.appendChild(div);
    })

    this.tablemenu.innerHTML = ''
    this.tablemenu.appendChild(fragment)
  }

  updatePosition (event) {
    const tablemenuHeight = this.tablemenu.getBoundingClientRect().height
    const windowHeight = window.innerHeight

    this.tablemenu.style.left = `${event.pageX + 1}px`
    this.tablemenu.style.top = `${Math.min(event.pageY - 1, windowHeight - tablemenuHeight)}px`
  }

  showContextmenu (event) {
    const path = event.path || (event.composedPath && event.composedPath())
    for (let i = path.length - 1; i > 0; i--) {
      if (path[i].classList &&
        (
          path[i].classList.contains('ProseMirror-table-wrapper') ||
          path[i].classList.contains('ProseMirror-tablesidbar')
        )
      ) {
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