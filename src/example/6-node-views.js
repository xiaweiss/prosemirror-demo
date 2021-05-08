import {DOMParser} from "prosemirror-model"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {schema} from "prosemirror-schema-basic"

let content = document.getElementById("content")
let doc = DOMParser.fromSchema(schema).parse(content)

console.log('doc', doc)

let state = EditorState.create({
  doc
})

class ImageView {
  constructor(node, view, getPos) {
    console.log('=====')
    console.log(node)
    console.log(view)
    console.log(getPos)
    // The editor will use this as the node's DOM representation
    this.dom = document.createElement("img")
    this.dom.src = node.attrs.src
    this.dom.alt = node.attrs.alt
    this.dom.addEventListener("click", e => {
      console.log("You clicked me!")
      e.preventDefault()

      let alt = '456' // prompt("New alt text:", "")
      view.dispatch(view.state.tr.setNodeMarkup(getPos(), null, {
        src: node.attrs.src,
        alt
      }))
    })
  }

  stopEvent() { return true }
}

let view = new EditorView(document.body, {
  state,
  nodeViews: {
    image(node, view, getPos) { return new ImageView(node, view, getPos) }
  }
})