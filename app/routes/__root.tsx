// app/routes/__root.tsx
import {Outlet, createRootRoute} from '@tanstack/react-router'
import {Meta, Scripts} from '@tanstack/start'
import type {ReactNode} from 'react'

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
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({children}: Readonly<{children: ReactNode}>) {
  return (
    <html color-mode="user">
      <head>
        <Meta />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
