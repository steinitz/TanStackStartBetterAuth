import { createFileRoute } from '@tanstack/react-router'
import { ContactForm } from '../../stzUser/components/RouteComponents/ContactForm'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
})

function ContactPage() {
  return (
    <div>
      <ContactForm heading="We'd like to hear from you" />
    </div>
  )
}