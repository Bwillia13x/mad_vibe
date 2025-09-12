// Lightweight route prefetcher to speed up navigation on hover/focus
export function prefetchRoute(path: string) {
  switch (path) {
    case '/':
      return import('@/pages/home');
    case '/scheduling':
      return import('@/pages/scheduling');
    case '/inventory':
      return import('@/pages/inventory');
    case '/staff':
      return import('@/pages/staff');
    case '/analytics':
      return import('@/pages/analytics');
    default:
      return Promise.resolve();
  }
}

