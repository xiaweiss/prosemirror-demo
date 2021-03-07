import { Schema } from 'prosemirror-model'
import * as T from './schemaType.js'

let tempCopyDom = null // 用来存储临时粘贴数据
// :: Object
// [Specs](#model.NodeSpec) for the nodes defined in this schema.
export const nodes = {
  // :: NodeSpec The top level document node.
  [T.DOC]: {
    content: 'block+'
  },

  // :: NodeSpec A plain paragraph textblock. Represented in the DOM
  // as a `<p>` element.
  [T.PARAGRAPH]: {
    content: 'inline*',
    group: 'block',
    attrs: {
      indent: { default: 0 },
      number: { default: 0 },
      align: { default: null },
      origin: { default: null }
    },
    isBase: true,
    parseDOM: [
      { tag: 'p', getAttrs (dom) {
        let indent = 0
        let align = null
        const attributeNames = dom.getAttributeNames()
        attributeNames.forEach(name => {
          if (name.indexOf('data-indent') > -1) {
            indent = Number(name.match(/\d/)[0])
          }
          if (name === 'data-align-right') {
            align = 'right'
          }
          if (name === 'data-align-center') {
            align = 'center'
          }
        })
        const number = Number(dom.getAttribute('data-number'))
        return {
          number,
          indent,
          align
        }
      } },
      { tag: 'br', attrs: { origin: 'br' }}
    ],
    toDOM (node) {
      const { indent, number, align } = node.attrs
      const attrs = {}
      if (typeof indent === 'number' && indent > 0 && indent < 9) {
        attrs[`data-indent-${indent}`] = ''
      }
      if (typeof number === 'number' && number > 0) {
        attrs['data-number'] = number
      }
      if (['center', 'right'].indexOf(align) > -1) {
        attrs[`data-align-${align}`] = ''
      }
      return ['p', attrs, 0]
    }
  },

  // :: NodeSpec A blockquote (`<blockquote>`) wrapping one or more blocks.
  [T.BLOCK_QUOTE]: {
    content: 'block+',
    group: 'block',
    defining: true,
    parseDOM: [
      { tag: 'blockquote' },
      // 兼容dropbox的quote
      { tag: '.listtype-quote' }
    ],
    toDOM () { return ['blockquote', 0] }
  },

  // :: NodeSpec A horizontal rule (`<hr>`).
  [T.HORIZONTAL_RULE]: {
    group: 'block',
    atom: true,
    parseDOM: [{ tag: 'hr' }],
    toDOM () { return ['hr'] }
  },

  // :: NodeSpec A heading textblock, with a `level` attribute that
  // should hold the number 1 to 6. Parsed and serialized as `<h1>` to
  // `<h6>` elements.
  [T.HEADING]: {
    attrs: {
      align: { default: null },
      level: { default: 1 }
    },
    marks: `${T.COLOR} ${T.BG_COLOR} ${T.ITALIC} ${T.UNDERLINE} ${T.DEL}`,
    content: 'inline*',
    group: 'block',
    defining: true,
    parseDOM: [{ tag: 'h1', attrs: { level: 1 }},
               { tag: 'h2', attrs: { level: 2 }},
               { tag: 'h3', attrs: { level: 3 }},
               { tag: 'h4', attrs: { level: 4 }},
               { tag: 'h5', attrs: { level: 5 }}],
    toDOM (node) {
      const attrs = {}
      const align = node.attrs.align
      let level = node.attrs.level
      if ([1, 2, 3, 4, 5].indexOf(level) < 0) {
        level = 5
      }
      if (['center', 'right'].indexOf(align) > -1) {
        attrs[`data-align-${align}`] = ''
      }
      return ['h' + level, attrs, 0]
    }
  },

  // :: NodeSpec A code listing. Disallows marks or non-text inline
  // nodes by default. Represented as a `<pre>` element with a
  // `<code>` element inside of it.
  [T.CODE_BLOCK]: {
    attrs: { lang: { default: 'text' }},
    content: 'text*',
    marks: '',
    group: 'block',
    code: true,
    parseDOM: [{
      tag: 'pre',
      preserveWhitespace: 'full',
      getAttrs: dom => {
        dom.innerHTML = dom.innerHTML.replace(/<br[^>]*>/gi, '\n')
        return {
          lang: dom.getAttribute('lang')
        }
      }
    }],
    toDOM () { return ['pre', ['code', 0]] }
  },
  [T.KATEX_BLOCK]: {
    attrs: {
      mathString: { default: null }
    },
    marks: '',
    group: 'block',
    atom: true,
    parseDOM: [{
      tag: 'div[data-pm-katex-block]',
      getAttrs: dom => {
        let attrs = dom.getAttribute('data-pm-attrs')
        try {
          attrs = JSON.parse(attrs)
        } catch (err) {
          attrs = null
        }
        if (attrs) {
          return {
            mathString: attrs.mathString
          }
        } else {
          return {
            mathString: 'Katex_no_found'
          }
        }
      }
    }],
    toDOM (node) {
      // 编辑器内复制粘贴需要用到
      const dom = document.createElement('div')
      dom.setAttribute('data-pm-attrs', JSON.stringify(node.attrs))
      dom.setAttribute('data-pm-katex-block', '')
      dom.innerText = node.attrs.mathString
      return dom
    },
    toText (node) {
      return `$$${node.attrs.mathString}$$`
    }
  },
  [T.KATEX_INLINE]: {
    attrs: {
      mathString: { default: null }
    },
    marks: '',
    group: 'inline',
    inline: true,
    atom: true,
    parseDOM: [{
      tag: 'span[data-pm-katex-inline]',
      getAttrs: dom => {
        let attrs = dom.getAttribute('data-pm-attrs')
        try {
          attrs = JSON.parse(attrs)
        } catch (err) {
          attrs = null
        }
        if (attrs) {
          return {
            mathString: attrs.mathString
          }
        } else {
          return {
            mathString: 'Katex_no_found'
          }
        }
      }
    }],
    toDOM (node) {
      const dom = document.createElement('span')
      dom.setAttribute('data-pm-attrs', JSON.stringify(node.attrs))
      dom.setAttribute('data-pm-katex-inline', '')
      dom.innerText = node.attrs.mathString
      tempCopyDom = dom
      return dom
    },
    toText (node) {
      return `$${node.attrs.mathString}$`
    },
    transformCopyDom () {
      // hack ProseMirror-View 中的 serializeForClipboard 方法中没有提供修改data-pm-slice的地方
      // 由于 dom.setAttribute('data-pm-slice') 在 clipboardTextSerializer 之前
      // 所以可以通过 clipboardTextSerializer 生命周期来触发
      // 见createEditorView.js的 clipboardTextSerializer 配置
      if (tempCopyDom && tempCopyDom.getAttribute('data-pm-katex-inline') === '') {
        console.log(tempCopyDom)
        tempCopyDom.setAttribute('data-pm-slice', `1 1 ${JSON.stringify(['paragraph', null])}`)
      }
      tempCopyDom = null
    }
  },
  // :: NodeSpec The text node.
  [T.TEXT]: {
    group: 'inline'
  },
  // :: NodeSpec An inline image (`<img>`) node. Supports `src`,
  // `alt`, and `href` attributes. The latter two default to the empty
  // string.
  [T.IMAGE]: {
    attrs: {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      style: { default: null },
      href: { default: null },
      fromPaste: { default: false }, // 来自粘贴
      pastePass: { default: false } // 粘贴内容通过修正
    },
    group: 'block',
    atom: true,
    parseDOM: [{ tag: 'img[src]', getAttrs (dom) {
      const attrs = dom.getAttribute('data-pm-attrs')
      if (attrs) {
        return JSON.parse(attrs)
      } else {
        return {
          src: dom.getAttribute('src'),
          title: dom.getAttribute('title'),
          alt: dom.getAttribute('alt')
        }
      }
    } }],
    toDOM (node) {
      // 编辑器内复制粘贴需要用到
      const attrs = {}
      attrs['data-pm-attrs'] = JSON.stringify(node.attrs)
      attrs['src'] = node.attrs.src
      attrs['title'] = node.attrs.title
      attrs['alt'] = node.attrs.alt
      return ['img', attrs]
    }
  },
  [T.VIDEO]: {
    attrs: {
      videoHTML: { default: null }
    },
    group: 'block',
    atom: true,
    toDOM () {
      return ['div']
    }
  },
  [T.EMBED_COMPONENT]: {
    attrs: {
      type: { default: '' },
      data: { default: null }
    },
    group: 'block',
    atom: true,
    parseDOM: [
      {
        tag: 'div[data-pm-embed-component]',
        getAttrs: dom => {
          let attrs = dom.getAttribute('data-pm-attrs')
          try {
            attrs = JSON.parse(attrs)
          } catch (err) {
            attrs = {}
          }
          return attrs
        }
      },
      {
        tag: 'table',
        getAttrs: dom => {
          if (dom.className === 'table_prosemirror') {
            return false
          }
          const attrs = {}
          attrs.type = 'table'
          attrs.data = {
            content: dom.outerHTML
          }
          return attrs
        }
      }
    ],
    toDOM (node) {
      const dom = document.createElement('div')
      dom.setAttribute('data-pm-attrs', JSON.stringify(node.attrs))
      dom.setAttribute('data-pm-embed-component', '')
      return dom
    }
  },
  [T.LINK]: {
    inline: true,
    content: 'text*',
    group: 'inline',
    marks: `${T.BG_COLOR} ${T.ITALIC} ${T.UNDERLINE} ${T.DEL}`,
    attrs: {
      href: {},
      title: { default: '' },
      type: { default: null } // 用来区别是否是话题，因为话题也用的是链接
    },
    // 链接不能复制进来，因为需要链接需要检查，而检查逻辑在业务端
    parseDOM: [{ tag: 'a[href]', getAttrs (dom) {
      const href = dom.getAttribute('href')
      if (href && href.length > 1) {
        return { href, title: dom.getAttribute('title') }
      } else {
        return false
      }
    } }],
    toDOM (node) {
      const { href, title } = node.attrs
      const id = T.LINK + String((new Date()).getTime()).slice(-6)
      return ['a', { href, title, 'data-type': T.LINK, 'data-id': id }, 0]
    }
  },
  // :: MarkSpec Code font mark. Represented as a `<code>` element.
  [T.CODE_INLINE]: {
    inline: true,
    content: 'text*',
    group: 'inline',
    parseDOM: [
      { tag: 'code' },
      // 兼容dropbox的code内容
      { tag: '.inline-code' },
      { tag: 'a', getAttrs (dom) {
        if (dom.getAttribute('data-type') === T.CODE_INLINE) {
          return {}
        } else {
          return false
        }
      } }
    ],
    // 这里是为了hack 在code标签旁输入会继承code的样式，改成a标签就没有这种特性了
    toDOM () {
      return ['a', { href: '#', 'data-type': T.CODE_INLINE }, 0]
    }
  },
  [T.SUP]: {
    inline: true,
    content: 'text*',
    group: 'inline',
    parseDOM: [
      { tag: 'sup' }
    ],
    toDOM () {
      return ['a', { href: '#', 'data-type': T.SUP }, 0]
    }
  },
  [T.SUB]: {
    inline: true,
    content: 'text*',
    group: 'inline',
    parseDOM: [
      { tag: 'sub' }
    ],
    toDOM () {
      return ['a', { href: '#', 'data-type': T.SUB }, 0]
    }
  },
  [T.ZERO_WIDTH]: {
    marks: '',
    group: 'inline',
    selectable: false,
    inline: true,
    atom: true,
    toDOM () { return ['span', 0] }
  }
}

// :: Object [Specs](#model.MarkSpec) for the marks in the schema.
export const marks = {
  // :: MarkSpec An emphasis mark. Rendered as an `<em>` element.
  // Has parse rules that also match `<i>` and `font-style: italic`.
  [T.ITALIC]: {
    parseDOM: [{ tag: 'i' }, { tag: 'em' }, { style: 'font-style=italic' }],
    toDOM () { return ['i', 0] }
  },

  [T.DEL]: {
    parseDOM: [
      { tag: 's' },
      { tag: 'strike' },
      { style: 'text-decoration=line-through' }
    ],
    toDOM () { return ['s', 0] }
  },

  [T.UNDERLINE]: {
    parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }],
    toDOM () { return ['u', 0] }
  },

  [T.SIZE]: {
    attrs: {
      size: {}
    },
    toDOM (mark) {
      const size = mark.attrs.size
      if (typeof size === 'number' && size > 8 && size < 99) {
        return ['span', { 'data-size': `${size}` }, 0]
      } else {
        return ['span', 0]
      }
    }
  },

  [T.COLOR]: {
    attrs: {
      color: {},
      name: {}
    },
    parseDOM: [{ style: 'color', getAttrs: value => {
      if (/^#[a-f0-9]{6}$/i.test(value)) {
        return {
          name: 'user',
          color: value
        }
      } else {
        return false
      }
    } }],
    toDOM (mark) {
      const color = mark.attrs.color
      const name = mark.attrs.name
      if (/^#[a-f0-9]{6}$/i.test(color) && /^[a-z_]{1,20}$/i.test(name)) {
        return ['span', { 'style': `color: ${color}`, 'data-name': name }, 0]
      } else {
        return ['span', 0]
      }
    }
  },

  [T.BG_COLOR]: {
    attrs: {
      color: {},
      name: {}
    },
    // parseDOM: [
    //   {
    //     style: 'background',
    //     getAttrs: value => {
    //       if (/^#[a-f0-9]{6}$/i.test(value)) {
    //         return {
    //           name: 'user',
    //           color: value
    //         }
    //       } else {
    //         return false
    //       }
    //     }
    //   }, {
    //     style: 'background-color',
    //     getAttrs: value => {
    //       if (/^#[a-f0-9]{6}$/i.test(value)) {
    //         return {
    //           name: 'user',
    //           color: value
    //         }
    //       } else {
    //         return false
    //       }
    //     }
    //   }
    // ],
    toDOM (mark) {
      const color = mark.attrs.color
      const name = mark.attrs.name
      if (/^#[a-f0-9]{6}$/i.test(color) && /^[a-z_]{1,20}$/i.test(name)) {
        return ['span', { 'style': `background: ${color}`, 'data-name': name }, 0]
      } else {
        return ['span', 0]
      }
    }
  },

  [T.STRONG]: {
    parseDOM: [
      { tag: 'strong' },
      {
        tag: 'b',
        getAttrs: node => {
          return node.style.fontWeight !== 'normal'
        }
      },
      {
        style: 'font-weight',
        getAttrs: value => {
          return /^(bold(er)?|[5-9]\d{2,})$/.test(value)
        }
      }
    ],
    toDOM () { return ['strong', 0] }
  }
}

nodes[T.NUMBERED_LIST] = {
  content: `${T.LIST_ITEM}+`,
  group: 'block',
  attrs: {
    start: { default: 1 },
    normalizeStart: { default: 1 }
  },
  parseDOM: [{ tag: 'ol', getAttrs (dom) {
    return { start: dom.getAttribute('start') }
  } }],
  toDOM (node) {
    const { start } = node.attrs
    const attrs = {}
    if (typeof start === 'number' && start > 1) {
      attrs.start = start
    }
    return ['ol', attrs, 0]
  }
}

nodes[T.BULLETED_LIST] = {
  content: `${T.LIST_ITEM}+`,
  group: 'block',
  parseDOM: [{ tag: 'ul' }],
  toDOM () { return ['ul', 0] }
}

nodes[T.LIST_ITEM] = {
  content: `(${T.PARAGRAPH}|${T.IMAGE})+`,
  group: 'block',
  attrs: {
    listStyle: { default: null }
  },
  parseDOM: [
    {
      tag: 'li',
      context: `${T.BULLETED_LIST}/|${T.NUMBERED_LIST}/`
    }
  ],
  toDOM (node) {
    const { listStyle } = node.attrs
    const attrs = {}
    if (typeof listStyle === 'string') {
      attrs['data-liststyle'] = listStyle
    }
    return ['li', attrs, 0]
  }
}

nodes[T.TABLE] = {
  content: `${T.TABLE_ROW}+`,
  tableRole: T.TABLE,
  attrs: {
    colWidth: { default: null }
  },
  group: 'block',
  isolating: true,
  parseDOM: [{
    tag: 'table',
    getAttrs (dom) {
      // 记得富表格开发好后，删除这个测试属性， embed_component那边也要做处理， 301行
      if (dom.className !== 'table_prosemirror') {
        return false
      }
      return { colWidth: null }
    }
  }],
  toDOM () { return ['table', ['tbody', 0]] }
}

nodes[T.TABLE_ROW] = {
  content: `(${T.TABLE_CELL})*`,
  tableRole: T.TABLE_ROW,
  parseDOM: [{ tag: 'tr' }],
  toDOM () { return ['tr', 0] }
}

nodes[T.TABLE_CELL] = {
  // content: `(${T.PARAGRAPH} | ${T.BULLETED_LIST} | ${T.NUMBERED_LIST})*`,
  content: 'block+',
  attrs: {
    colspan: { default: 1 },
    rowspan: { default: 1 },
    background: { default: null }
  },
  tableRole: T.TABLE_CELL,
  isolating: true,
  parseDOM: [
    { tag: 'td', getAttrs: dom => getCellAttrs(dom) },
    { tag: 'th', getAttrs: dom => getCellAttrs(dom) }
  ],
  toDOM (node) { return ['td', setCellAttrs(node), 0] }
}

// nodes[T.TABLE_HEADER] = {
//   content: `(${T.PARAGRAPH} | ${T.BULLETED_LIST} | ${T.NUMBERED_LIST})*`,
//   attrs: {
//     colspan: { default: 1 },
//     rowspan: { default: 1 },
//     background: { default: null }
//   },
//   tableRole: T.TABLE_HEADER,
//   isolating: true,
//   parseDOM: [{ tag: 'th', getAttrs: dom => getCellAttrs(dom) }],
//   toDOM (node) { return ['th', setCellAttrs(node), 0] }
// }

function getCellAttrs (dom) {
  const background = dom.getAttribute('data-background') || null
  const colspan = Number(dom.getAttribute('colspan') || 1)
  const rowspan = Number(dom.getAttribute('rowspan') || 1)
  const result = {
    colspan,
    rowspan,
    background
  }
  return result
}

function setCellAttrs (node) {
  const attrs = {}
  // if (typeof node.attrs.col === 'number') attrs.col = node.attrs.col
  // if (typeof node.attrs.row === 'number') attrs.row = node.attrs.row
  const colspan = node.attrs.colspan
  const rowspan = node.attrs.rowspan
  if (typeof colspan === 'number' && colspan > 1) attrs.colspan = colspan
  if (typeof rowspan === 'number' && rowspan > 1) attrs.rowspan = rowspan
  if (node.attrs.background) {
    attrs.style = (attrs.style || '') + `background-color: ${node.attrs.background};`
  }
  return attrs
}

export const schema = new Schema({
    nodes,
    marks
})
