const decodeTokenPayload = (token) => {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    const decoded =
      typeof window !== 'undefined'
        ? window.atob(padded)
        : Buffer.from(padded, 'base64').toString('binary')

    const jsonPayload = decodeURIComponent(
      decoded
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )

    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export const isTokenExpired = (token, offsetSeconds = 30) => {
  const payload = decodeTokenPayload(token)
  if (!payload?.exp) {
    return false
  }

  const currentTime = Math.floor(Date.now() / 1000)
  return payload.exp <= currentTime + offsetSeconds
}

// Helper to check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('auth-storage')
  if (!token) return false
  
  try {
    const authData = JSON.parse(token)
    const storedToken = authData?.state?.token
    if (!storedToken) return false

    if (isTokenExpired(storedToken)) {
      return false
    }

    return !!authData?.state?.user
  } catch {
    return false
  }
}

// Helper to get auth token
export const getAuthToken = () => {
  try {
    const authData = localStorage.getItem('auth-storage')
    if (!authData) return null
    const parsed = JSON.parse(authData)
    return parsed?.state?.token || null
  } catch {
    return null
  }
}

