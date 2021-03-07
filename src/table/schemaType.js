export const DOC = 'doc'

export const PARAGRAPH = 'paragraph'

export const BLOCK_QUOTE = 'blockquote'

export const HORIZONTAL_RULE = 'horizontalrule'

export const HEADING = 'heading'

export const CODE_BLOCK = 'codeblock'

export const CODE_BLOCK_PREVIEW = 'pre' // 为prosemirror长文预览器专用

export const CODE_BLOCK_PREVIEW_LINE = 'codeline' // 为prosemirror长文预览器专用

export const KATEX_BLOCK = 'katexblock'

export const KATEX_INLINE = 'katexinline'

export const IMAGE = 'image'

export const VIDEO = 'video'

export const EMBED_COMPONENT = 'embedcomp' // 嵌入类型, 组件嵌入

export const NUMBERED_LIST = 'numberedlist'

export const BULLETED_LIST = 'bulletedlist'

export const LIST_ITEM = 'listitem'

export const LINK = 'link'

// 代码高亮使用的，编辑器里不会出现该mark，只有预览器出现
export const MARK_CLASS = 'markclass'

export const ITALIC = 'italic'

export const DEL = 'del'

export const UNDERLINE = 'underline'

export const STRONG = 'strong'

export const SIZE = 'size'

export const COLOR = 'color'

export const BG_COLOR = 'bgcolor'

export const INDENT = 'indent'

export const ALIGN = 'align'

export const CODE_INLINE = 'codeinline'

export const SUP = 'sup'

export const SUB = 'sub'

export const TEXT = 'text'

export const ZERO_WIDTH = 'zerowidth'

/** 装饰类型 Decoration */
export const D_DECO = 'deco'

export const D_NOTE = 'note' // 笔记，带评论的标记，表示成字的背景色

export const D_MARK = 'mark' // 重点记号，不带评论的标记，表示成字的下划线

export const D_PUBLIC = 'public' // 公开笔记，带评论的标记，表示成字的虚下划线

/** 表格类型 */
export const TABLE = 'table'
export const TABLE_ROW = 'row'
export const TABLE_HEADER = 'headercell'
export const TABLE_CELL = 'cell'

/** 叶子块节点类型，获取底层块节点做节点index */
export const LEAF_BLOCK_TYPES = [
  PARAGRAPH,
  HEADING,
  HORIZONTAL_RULE,
  CODE_BLOCK_PREVIEW_LINE,
  KATEX_BLOCK,
  IMAGE,
  EMBED_COMPONENT,
  VIDEO
]

/** 自定义nodeView类型，非文本类型节点，用来判断是否要在多个nodeview之间插入空行 */
export const NODE_VIEW_TYPES = [
  KATEX_BLOCK,
  IMAGE,
  VIDEO,
  CODE_BLOCK,
  EMBED_COMPONENT,
  HORIZONTAL_RULE
]

export const INLINE_TYPES = [
  TEXT,
  LINK,
  SUP,
  SUB,
  KATEX_INLINE,
  CODE_INLINE
]
