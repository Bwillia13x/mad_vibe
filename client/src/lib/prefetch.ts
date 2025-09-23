// Lightweight route prefetcher to speed up navigation on hover/focus
export function prefetchRoute(path: string) {
  switch (path) {
    case '/':
      return import('@/pages/home')
    case '/scheduling':
      return import('@/pages/scheduling')
    case '/inventory':
      return import('@/pages/inventory')
    case '/staff':
      return import('@/pages/staff')
    case '/analytics':
      return import('@/pages/analytics')
    case '/pos':
      return import('@/pages/pos')
    case '/marketing':
      return import('@/pages/marketing')
    case '/loyalty':
      return import('@/pages/loyalty')
    default:
      return Promise.resolve()
  }
}
