import { createFileRoute } from '@tanstack/react-router'
import { ReadingContainer } from '~stzUtils/components/ReadingContainer'
import { Privacy } from '../../../stzUser/components/Legal/Privacy'

export const Route = createFileRoute('/legal/privacy')({
  component: () => (
    <ReadingContainer>
      <Privacy />
    </ReadingContainer>
  ),
})
