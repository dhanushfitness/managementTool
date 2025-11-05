// Helper to check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('auth-storage')
  if (!token) return false
  
  try {
    const authData = JSON.parse(token)
    return !!(authData?.state?.token && authData?.state?.user)
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

