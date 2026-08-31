export function useAuth() {
  const token = useCookie('jcpms_token', {
    sameSite: 'lax',
    secure: !import.meta.dev,
    maxAge: 60 * 60 * 8,
  })
  const user = useState('auth-user', () => null)
  const config = useRuntimeConfig()

  async function login(identifier, password) {
    const data = await $fetch('/auth/login', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { identifier, password },
    })
    token.value = data.token
    user.value = data.user
    return data.user
  }

  async function register(username, email, password) {
    const data = await $fetch('/auth/register', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { username, email, password },
    })
    token.value = data.token
    user.value = data.user
    return data.user
  }

  function clearSession() {
    token.value = null
    user.value = null
  }

  async function logout() {
    clearSession()
    await navigateTo('/login')
  }

  async function api(path, options = {}) {
    try {
      return await $fetch(path, {
        baseURL: config.public.apiBase,
        ...options,
        headers: {
          ...options.headers,
          ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
        },
      })
    } catch (error) {
      if (error?.status === 401 || error?.statusCode === 401) clearSession()
      throw error
    }
  }

  async function fetchMe() {
    if (!token.value) return null
    user.value = await api('/auth/me')
    return user.value
  }

  return { token, user, login, register, logout, clearSession, api, fetchMe }
}
