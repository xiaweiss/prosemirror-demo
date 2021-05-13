import {Plugin, PluginKey} from "prosemirror-state"
import {CellSelection} from './cellselection'
import './tableMenu.css'

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
import {cellWrapping} from './util'
import { deleteSelection } from 'prosemirror-commands'

export const tableMenuKey = new PluginKey("tableMenu")

export function tableMenu() {
  return new Plugin({
    key: tableMenuKey,

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
    this.tableMenu = null
    this.init()
  }

  data () {
    // NOTE: use 'view.state' to get latest state, don't direct use state from 'const {state} = view'
    const { dispatch } = this.view

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
        disabled: !(view.state.selection instanceof CellSelection),
        command: () => deleteSelection(view.state, dispatch)
      },
      { hr: true },
      {
        text: '向上插入 1 行',
        command: () => addRowBefore(view.state, dispatch)
      },
      {
        text: '向下插入 1 行',
        command: () => addRowAfter(view.state, dispatch)
      },
      {
        text: '向左插入 1 列',
        command: () => addColumnBefore (view.state, dispatch, view)
      },
      {
        text: '向右插入 1 列',
        command: () => addColumnAfter(view.state, dispatch, view)
      },
      { hr: true },
      {
        text: '合并单元格',
        disabled:
          !(view.state.selection instanceof CellSelection) ||
          view.state.selection.$anchorCell.pos === view.state.selection.$headCell.pos,
        command: () => mergeCells(view.state, dispatch)
      },
      {
        text: '拆分单元格',
        disabled: function () {
          const sel = view.state.selection
          let cellNode
          if (sel instanceof CellSelection) {
            if (sel.$anchorCell.pos != sel.$headCell.pos) return true
            cellNode = sel.$anchorCell.nodeAfter
          } else {
            cellNode = cellWrapping(sel.$from)
            if (!cellNode) return true
          }
          return (cellNode.attrs.colspan === 1 && cellNode.attrs.rowspan === 1)
        }(),
        command: () => splitCell(view.state, dispatch)
      },
      { hr: true },
      {
        text: '删除选中行',
        command: () => deleteRow(view.state, dispatch)
      },
      {
        text: '删除选中列',
        command: () => deleteColumn(view.state, dispatch)
      },
      { hr: true },
      {
        text: '删除表格',
        command: () => deleteTable(view.state, dispatch)
      },
    ]
  }

  init () {
    this.tableMenu = document.createElement("div")
    this.tableMenu.className = "Prosemirror-tableMenu"
    this.view.dom.parentNode.appendChild(this.tableMenu)

    this.tableMenu.addEventListener('mousedown', event => {
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
    this.tableMenu.removeEventListener('')
    document.removeEventListener('contextmenu', this.showContextmenu)
    document.removeEventListener('mousedown', this.hideContextmenu)
    this.tableMenu.remove()
  }

  render () {
    const fragment = document.createDocumentFragment()
    const data = this.data()

    data.forEach((item) => {
      const div = document.createElement('div')
      div.classList.add(`Prosemirror-tableMenu-${item.hr ? 'hr' : 'item'}`)
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
        hoverDiv.classList.add('Prosemirror-tableMenu-item-hovertip')
        hoverDiv.textContent = item.hovertip
      }
      fragment.appendChild(div);
    })

    this.tableMenu.innerHTML = ''
    this.tableMenu.appendChild(fragment)
  }

  updatePosition (event) {
    const tableMenuHeight = this.tableMenu.getBoundingClientRect().height
    const windowHeight = window.innerHeight

    this.tableMenu.style.left = `${event.pageX + 1}px`
    this.tableMenu.style.top = `${Math.min(event.pageY - 1, windowHeight - tableMenuHeight)}px`
  }

  showContextmenu (event) {
    const path = event.path || (event.composedPath && event.composedPath())
    for (let i = path.length - 1; i > 0; i--) {
      if (path[i].classList &&
        (
          path[i].classList.contains('ProseMirror-table-wrapper') ||
          path[i].classList.contains('ProseMirror-tableSidebar')
        )
      ) {
        event.preventDefault()
        this.render()

        // 先在视口外展示，才能测量元素尺寸、计算位置
        this.tableMenu.style.display = 'block'
        this.updatePosition(event)
        break
      }
    }
  }

  hideContextmenu () {
    this.tableMenu.style.display = 'none'
    this.tableMenu.style.left = ''
    this.tableMenu.style.top = ''
  }
}