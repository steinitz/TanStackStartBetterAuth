import { createFileRoute } from '@tanstack/react-router'
import { ReadingContainer } from '~stzUtils/components/ReadingContainer'
import { About } from '../../../stzUser/components/Legal/About'

export const Route = createFileRoute('/legal/about')({
  component: () => (
    <ReadingContainer>
      <About />
    </ReadingContainer>
  ),
})
