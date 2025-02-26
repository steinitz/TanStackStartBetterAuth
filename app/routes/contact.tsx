import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {Contact} from '~/components/Contact'

const contact = ()=> {
  return (
    <>
      <section>
      <Contact />
      </section>
    </>
  )
}

export const Route = createFileRoute('/contact')({
  component: contact,
})

