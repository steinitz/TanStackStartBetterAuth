// src/routes/__root.tsx
/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'


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
        title: 'TanStack Start App',
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

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html color-mode="user">
      <head>
        <HeadContent />
      </head>
      <body>
        <main>{children}</main>
        <Scripts />
      </body>
    </html>
  )
}