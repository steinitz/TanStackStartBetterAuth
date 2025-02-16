import {createFileRoute, useRouter} from "@tanstack/react-router";

export const Profile = () => {
  const router = useRouter()

  return (
    <>
      <div>
        <h1>Profile</h1>
      </div>
      <button
        type={"submit"}
        onClick={async () => {
          await router.invalidate({sync: true})
          router.navigate({to: '/'})
        }}
      >
        Index - for troubleshooting, remove
      </button>
    </>
  )
}

export const Route = createFileRoute('/profile')({
  component: Profile,
  // loader: async () => await getCount(),
})

