import { useEffect } from 'react'

// Route export removed - this component is now imported by src/routes/_app/auth/verify-email.tsx
// export const Route = createFileRoute('/_app/auth/verify-email')({ 
//   component: VerifyEmail,
// })

export function VerifyEmail() {
  // Note: Removed problematic imports that don't exist in better-auth/react
  const searchParams = new URLSearchParams(window.location.search)
  const token = searchParams.get('token')

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