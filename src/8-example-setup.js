import 'prosemirror-view/style/prosemirror.css'
import 'prosemirror-menu/style/menu.css'
import 'prosemirror-example-setup/style/style.css'
import 'prosemirror-tables/style/tables.css'
import 'prosemirror-gapcursor/style/gapcursor.css'

import './7-tables.css'

import {schema} from "prosemirror-schema-basic"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {undo, redo, history} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {baseKeymap} from "prosemirror-commands"
import {buildInputRules, buildKeymap, buildMenuItems, exampleSetup} from 'prosemirror-example-setup'

let state = EditorState.create({
  schema,
  plugins: exampleSetup({schema})
})
let view = new EditorView(document.body, {state})