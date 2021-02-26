
import {DOMParser} from "prosemirror-model"

function createDocument({schema, content, parseOptions = {}, emptyDocument = {type: 'doc', content: [{type: 'paragraph'}]}}) {
  if (content === null) {
    return schema.nodeFromJSON(emptyDocument)
  }

  if (typeof content === 'object') {
    try {
      return schema.nodeFromJSON(content)
    } catch (error) {
      console.warn('[warn]: Invalid content.', 'Passed value:', content, 'Error:', error)
      return schema.nodeFromJSON(emptyDocument)
    }
  }

  if (typeof content === 'string') {
    const htmlString = `<div>${content}</div>`
    const parser = new window.DOMParser()
    const element = parser.parseFromString(htmlString, 'text/html').body.firstElementChild
    return DOMParser.fromSchema(schema).parse(element, parseOptions)
  }

  return false
}

export default createDocument
