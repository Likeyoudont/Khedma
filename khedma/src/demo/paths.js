export function scoped(to, demo) {
  if (!demo) return to
  const path = typeof to === 'string' ? to : to?.pathname
  if (!path?.startsWith('/') || path.startsWith('/developer')) return to
  const target = ['/login', '/register'].includes(path) ? '/developer' : `${demo.base}${path}`
  return typeof to === 'string' ? target : { ...to, pathname: target }
}
