import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Setup() {
  const navigate = useNavigate()

  // Redirect to dashboard when someone manually navigates to /setup
  useEffect(() => {
    navigate('/', { replace: true })
  }, [navigate])

  // Return null while redirecting
  return null
}


