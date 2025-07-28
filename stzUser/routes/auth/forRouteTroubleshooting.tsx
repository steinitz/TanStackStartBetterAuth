import {createFileRoute, useRouter} from '@tanstack/react-router'

export const Profile = () => {
  const router = useRouter()

  return (
    <>
      <div>
        <h1>For Route Troubleshooting</h1>
      </div>
      <button
        type={'submit'}
        onClick={async () => {
          await router.invalidate({sync: true})
          router.navigate({to: '/'})
        }}
      >
        Index
      </button>
    </>
  )
}
