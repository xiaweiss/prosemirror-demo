import 'prosemirror-view/style/prosemirror.css'
import 'prosemirror-menu/style/menu.css'
import 'prosemirror-example-setup/style/style.css'
import 'prosemirror-tables/style/tables.css'
import 'prosemirror-gapcursor/style/gapcursor.css'

import {Plugin} from "prosemirror-state"

let selectionSizePlugin = new Plugin({
  view(editorView) { return new SelectionSizeTooltip(editorView) }
})
class SelectionSizeTooltip {
  constructor(view) {
    document.querySelector("#editor").style = 'position: relative'
    this.tooltip = document.createElement("div")
    this.tooltip.className = "tooltip"
    this.tooltip.style = `
      position: absolute;
      pointer-events: none;
      z-index: 20;
      background: white;
      border: 1px solid silver;
      border-radius: 2px;
      padding: 2px 10px;
      margin-bottom: 7px;
      -webkit-transform: translateX(-50%);
      transform: translateX(-50%);
    `
    view.dom.parentNode.appendChild(this.tooltip)

    this.update(view, null)
  }

  update(view, lastState) {
    let state = view.state
    // Don't do anything if the document/selection didn't change
    if (lastState && lastState.doc.eq(state.doc) &&
        lastState.selection.eq(state.selection)) return

    // Hide the tooltip if the selection is empty
    if (state.selection.empty) {
      this.tooltip.style.display = "none"
      return
    }

    console.log('state.selection', state.selection)

    // Otherwise, reposition it and update its content
    this.tooltip.style.display = ""
    let {from, to} = state.selection
    // These are in screen coordinates
    let start = view.coordsAtPos(from), end = view.coordsAtPos(to)
    console.log('start end', start, end)


    // The box in which the tooltip is positioned, to use as base
    let box = this.tooltip.offsetParent.getBoundingClientRect()
    // Find a center-ish x position from the selection endpoints (when
    // crossing lines, end may be more to the left)
    let left = Math.max((start.left + end.left) / 2, start.left + 3)
    this.tooltip.style.left = (left - box.left) + "px"
    this.tooltip.style.bottom = (box.bottom - start.top) + "px"
    this.tooltip.textContent = to - from
  }

  destroy() { this.tooltip.remove() }
}

import {DOMParser} from "prosemirror-model"
import {schema} from "prosemirror-schema-basic"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {undo, redo, history} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import createElement from './utils/create-element'

const content = createElement(`
<p>Select some text to see a tooltip with the size of your selection.</p>
<p>(That's not the most useful use of a tooltip, but it's a nicely simple example.)</p>
`)

let startDoc = DOMParser.fromSchema(schema).parse(content)

let state = EditorState.create({
  doc: startDoc,
  schema,
  plugins: [
    history(),
    keymap({"Mod-z": undo, "Mod-y": redo}),
    selectionSizePlugin
  ]
})

window.view = new EditorView(document.querySelector("#editor"), {state})

import applyDevTools from "prosemirror-dev-tools"
applyDevTools(window.view);

