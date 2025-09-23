import '@testing-library/jest-dom'

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  root: Element | null = null
  rootMargin: string = ''
  thresholds: ReadonlyArray<number> = []
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {}
  })
})

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: () => 'mock-url'
})

Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: () => {}
})

// Mock document.createElement for anchor elements
const originalCreateElement = document.createElement.bind(document)
document.createElement = (tagName: string) => {
  if (tagName === 'a') {
    const element = originalCreateElement(tagName) as HTMLAnchorElement
    element.click = () => {}
    element.href = ''
    element.download = ''
    return element
  }
  return originalCreateElement(tagName)
}

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: async () => {}
  }
})
