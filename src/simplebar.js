import Simplebar from 'simplebar'
import 'simplebar/dist/simplebar.css'

const wrapper = document.body.appendChild(document.createElement('div'))
wrapper.style.maxWidth = '500px'
wrapper.style.border = '1px solid blue'
wrapper.style.overflow = 'auto'

const table = wrapper.appendChild(document.createElement('table'))
table.style.width = '1000px'
table.style.height = '500px'
table.style.display = 'block'

window.Simplebar = Simplebar
// new Simplebar(wrapper)