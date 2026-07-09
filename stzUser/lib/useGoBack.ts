import { useNavigate, useRouter } from '@tanstack/react-router'

// Returns the user to whatever they were doing before the current flow interrupted them: the prior
// in-app page if there is one, else Home. canGoBack() reads a router-managed per-entry index that is
// 0 on any fresh arrival (deep-link, external link, typed URL), so we call history.back() only when
// there is genuinely an in-app page behind us — otherwise we land on Home rather than flinging the
// user off-site. Named useGoBack (not useReturn) to avoid overloading `return` in code.
export function useGoBack() {
  const router = useRouter()
  const navigate = useNavigate()
  return () =>
    router.history.canGoBack() ? router.history.back() : navigate({ to: '/' })
}
