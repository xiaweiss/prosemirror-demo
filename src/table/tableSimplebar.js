import {Decoration, DecorationSet} from "prosemirror-view"
import {Plugin, PluginKey} from "prosemirror-state"
import {CellSelection, TableMap, selectedRect} from "../prosemirror-tables/src"
import Simplebar from 'simplebar'

window.Simplebar = Simplebar

export const tableSimplebarKey = new PluginKey("tableSimplebar")

export function tableSimplebar() {
  return new Plugin({
    key: tableSimplebarKey,

    state: {
      init() {
        document.addEventListener('DOMContentLoaded', (event) => {
          console.log('DOMContentLoaded')
          console.log(document.querySelector('table'))
          const tableWrapper = document.querySelector('table').parentNode
          new Simplebar(tableWrapper)
        })


        console.log('table state init')
        console.log(document.querySelector('table'))
        return null
      },
      apply() {
        console.log('table state apply')
        console.log(document.querySelector('table'))
        return null
      }
    },

    props: {
      decorations (state) {
        console.log('decorations')
        console.log(document.querySelector('table'))
        return null
      }
    }
  })
}