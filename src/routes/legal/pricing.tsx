import { createFileRoute } from '@tanstack/react-router'
import { ReadingContainer } from '~stzUtils/components/ReadingContainer'
import { Pricing } from '../../components/Legal/Pricing'

export const Route = createFileRoute('/legal/pricing')({
  component: () => (
    <ReadingContainer>
      <Pricing />
    </ReadingContainer>
  ),
})
