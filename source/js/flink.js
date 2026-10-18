// Only remote friend-link pages load this script; local lists stay server-rendered.
;(async () => {
  const container = document.querySelector('.flink[data-flink-url]')
  if (!container) return

  const element = (tag, className, text) => {
    const node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined && text !== null) node.textContent = String(text)
    return node
  }
  const safeURL = value => {
    if (typeof value !== 'string' || !value.trim()) return ''
    try {
      const url = new URL(value, document.baseURI)
      return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
    } catch { return '' }
  }

  try {
    const response = await fetch(container.dataset.flinkUrl)
    if (!response.ok) throw new Error('HTTP ' + response.status)
    const groups = await response.json()
    if (!Array.isArray(groups)) throw new Error('Expected a friend-link array')
    const fragment = document.createDocumentFragment()
    const fallback = safeURL(container.dataset.flinkFallback)

    for (const group of groups) {
      if (!group || !Array.isArray(group.link_list)) continue
      if (group.class_name) {
        const name = String(group.class_name)
        const heading = element('h2', '', name)
        heading.id = name.replace(/[\p{P}\p{S}]/gu, '-')
        const permalink = element('a', 'headerlink')
        permalink.href = '#' + heading.id
        permalink.title = name
        heading.prepend(permalink)
        fragment.append(heading)
      }
      if (group.class_desc) fragment.append(element('div', 'flink-desc', group.class_desc))
      const list = element('div', 'flink-list')
      for (const friend of group.link_list) {
        const href = friend && safeURL(friend.link)
        if (!href) continue
        const item = element('div', 'flink-list-item')
        const link = element('a')
        link.href = href
        link.title = String(friend.name || '')
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        const icon = element('div', 'flink-item-icon')
        const image = element('img', 'no-lightbox')
        image.alt = link.title
        image.addEventListener('error', () => { if (fallback) image.src = fallback }, { once: true })
        const avatar = safeURL(friend.avatar) || fallback
        if (avatar) image.src = avatar
        icon.append(image)
        const description = element('div', 'flink-item-desc', friend.descr || '')
        description.title = String(friend.descr || '')
        link.append(icon, element('div', 'flink-item-name', friend.name || ''), description)
        item.append(link)
        list.append(item)
      }
      fragment.append(list)
    }
    container.prepend(fragment)
    if (window.lazyLoadInstance) window.lazyLoadInstance.update()
  } catch (error) {
    console.warn('Toybox: unable to load friend links:', error.message)
  }
})()
