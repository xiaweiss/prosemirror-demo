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


let view = new EditorView(document.body, {state})