export default defineNuxtRouteMiddleware(async (to) => {
  const publicRoutes = ['/login', '/register']
  const { token, user, fetchMe, clearSession } = useAuth()

  if (!token.value && !publicRoutes.includes(to.path)) return navigateTo('/login')

  if (token.value && !user.value) {
    try {
      await fetchMe()
    } catch {
      clearSession()
      if (!publicRoutes.includes(to.path)) return navigateTo('/login')
    }
  }

  if (token.value && publicRoutes.includes(to.path)) return navigateTo(user.value?.role === 'admin' ? '/admin' : '/')
  if (to.path.startsWith('/admin') && user.value?.role !== 'admin') return navigateTo('/')
})
