import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function usePostLoginRedirect() {
  const location = useLocation()

  useEffect(() => {
    // Routing is handled exclusively by AuthCallback.
    // This hook is intentionally disabled to avoid competing redirects.
    return
  }, [location.pathname])
}
