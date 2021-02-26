import {DOMParser} from "prosemirror-model"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {schema} from "prosemirror-schema-basic"
import createElement from './utils/create-element'

// let content = document.getElementById("content")
let content = createElement(`
<p>paragraph 1</p>
<p>paragraph 2</p>
<img src="https://static001.geekbang.org/resource/image/bb/21/bb38fb7c1073eaee1755f81131f11d21.jpg" alt="img-1" />
`)


let doc = DOMParser.fromSchema(schema).parse(content)

console.log('doc', doc)

let state = EditorState.create({
  doc
})


let view = new EditorView(document.body, {state})