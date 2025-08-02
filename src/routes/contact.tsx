import { createFileRoute } from '@tanstack/react-router'
import { ContactForm } from '../../stzUser/components/RouteComponents/ContactForm'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
})

function ContactPage() {
  return (
    <div>
      <h1>Contact Us</h1>
      <ContactForm />
    </div>
  )
}