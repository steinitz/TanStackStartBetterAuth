import { createFileRoute } from '@tanstack/react-router'
import { ReadingContainer } from '~stzUtils/components/ReadingContainer'
import { Refunds } from '../../../stzUser/components/Legal/Refunds'

export const Route = createFileRoute('/legal/refunds')({
  component: () => (
    <ReadingContainer>
      <Refunds />
    </ReadingContainer>
  ),
})
