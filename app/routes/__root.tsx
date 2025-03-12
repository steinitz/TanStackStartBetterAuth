// app/routes/__root.tsx
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState
} from '@tanstack/react-router'
// import {TanStackRouterDevtools} from '@tanstack/router-devtools'
import type {ReactNode} from 'react'
import {MainLayout} from '~/components/MainLayout'

/*
const TanStackRouterDevtools =
  process.env.NODE_ENV === 'production'
    ? () => null // Render nothing in production
    : React.lazy(() =>
        // Lazy load in development
        import('@tanstack/router-devtools').then((res) => ({
          default: res.TanStackRouterDevtools,
          // For Embedded Mode - requires isOpenOld and setIsOpen attributes
          // default: res.TanStackRouterDevtoolsPanel
        })),
      )
*/

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://unpkg.com/mvp.css',
      },
      {
        rel: 'stylesheet',
        href: '/mvp-css-override.css',
      },
      {
        rel: 'stylesheet',
        href: '/styles.css',
      },
      // fonts from https://fontawesome.com/
      {
        rel: 'stylesheet',
        type: 'text/css',
        href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
      }
    ]
   }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      {/*<div*/}
      {/*  style={{*/}
      {/*    display: 'flex',*/}
      {/*    width: '100%',*/}
      {/*    flexDirection: 'row',*/}
      {/*    justifyContent: 'space-between',*/}
      {/*    alignItems: 'flex-start',*/}
      {/*  }}*/}
      {/*>*/}
        <Outlet />
        {/*<Suspense fallback={null}>*/}
        {/*  <TanStackRouterDevtools  initialIsOpen={false}/>*/}
        {/*</Suspense>*/}
      {/*</div>*/}
    </RootDocument>
  )
}

function RootDocument({children}: Readonly<{children: ReactNode}>) {
  return (
    <>
    <html color-mode="user">
      <head>
        <HeadContent />
      </head>
      <body>
        <MainLayout>{children}</MainLayout>
        <Scripts />
      </body>
    </html>
    {/*<TanStackRouterDevtools initialIsOpen={false} />*/}
    </>
  )
}

function NotFoundComponent() {
  // as at 3 Feb 25 useLoaderData is not valid here

  // These are valid
  // const params = Route.useParams()
  // const search = Route.useSearch()

  // useful hook and note the useful, maybe over-engineered,
  // syntax to extract the location path string
  const location = useRouterState({select: (location) => location.location.pathname})

  return (
    <section>
      <h3>Path <span style={{color: 'var(--color-link)', textDecoration: 'underline'}}>{location}</span> not found</h3>
    </section>
  )
}
