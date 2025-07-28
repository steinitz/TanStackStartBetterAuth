import { useEffect, useState } from 'react'

export function VerifyEmail() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Only access window on the client side
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      setToken(searchParams.get('token'))
    }
  }, [])

  useEffect(() => {
    if (token) {
      // TODO: Implement email verification logic
      console.log('Verifying email with token:', token)
    }
  }, [token])

  return (
    <div>
      <h1>Verifying your email...</h1>
      <p>Please wait while we verify your email address.</p>
    </div>
  )
}