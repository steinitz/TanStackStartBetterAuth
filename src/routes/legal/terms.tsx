import { createFileRoute } from '@tanstack/react-router'
import { ReadingContainer } from '~stzUtils/components/ReadingContainer'
import { Terms } from '../../../stzUser/components/Legal/Terms'

export const Route = createFileRoute('/legal/terms')({
  component: () => (
    <ReadingContainer>
      <Terms />
    </ReadingContainer>
  ),
})
