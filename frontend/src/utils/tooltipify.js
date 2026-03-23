// tooltipify.js
// Copies `title` or `aria-label` into `data-tooltip` for a consistent custom tooltip
// and removes the native title to avoid the browser tooltip duplicating the UI.

function applyTooltipToElement(el) {
  if (!el) return
  // Skip if data-tooltip already present
  if (el.hasAttribute('data-tooltip')) return

  const title = el.getAttribute('title')
  const aria = el.getAttribute('aria-label')

  if (title && title.trim().length > 0) {
    el.setAttribute('data-tooltip', title.trim())
    // keep aria-label for screen readers
    if (!aria) el.setAttribute('aria-label', title.trim())
    // remove native title to avoid double tooltip
    el.removeAttribute('title')
    return
  }

  if (aria && aria.trim().length > 0) {
    el.setAttribute('data-tooltip', aria.trim())
    return
  }

  // If the element has only an icon (no text), try to infer from alt text of images or svg title
  const img = el.querySelector('img[alt]')
  if (img && img.alt) {
    el.setAttribute('data-tooltip', img.alt.trim())
    if (!aria) el.setAttribute('aria-label', img.alt.trim())
    return
  }

  const svgTitle = el.querySelector('svg title')
  if (svgTitle && svgTitle.textContent) {
    el.setAttribute('data-tooltip', svgTitle.textContent.trim())
    if (!aria) el.setAttribute('aria-label', svgTitle.textContent.trim())
    return
  }
}

function tooltipify(root = document) {
  if (!root) return

  // Apply to existing buttons and elements that are interactive
  const selector = 'button, [role="button"], a, .btn, .btn-icon'
  const els = Array.from(root.querySelectorAll(selector))
  els.forEach(el => applyTooltipToElement(el))

  // Observe for dynamically added elements (e.g., routed pages)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return
          if (node.matches && node.matches(selector)) applyTooltipToElement(node)
          // also find children
          const children = node.querySelectorAll ? node.querySelectorAll(selector) : []
          children.forEach(c => applyTooltipToElement(c))
        })
      }
    }
  })

  observer.observe(root, { childList: true, subtree: true })

  // Return observer for possible teardown (not used currently)
  return observer
}

// Auto-run on DOMContentLoaded
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => tooltipify(document))
  } else {
    tooltipify(document)
  }
}

export default tooltipify
