function createElement(content) {
  if (typeof content === 'string') {
    const htmlString = `<div>${content}</div>`
    const parser = new window.DOMParser()
    const element = parser.parseFromString(htmlString, 'text/html').body.firstElementChild
    return element
  }

  return false
}

export default createElement
