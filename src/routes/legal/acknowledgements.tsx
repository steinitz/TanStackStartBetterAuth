import { createFileRoute } from '@tanstack/react-router'
import { ReadingContainer } from '~stzUtils/components/ReadingContainer'
import { Acknowledgements } from '../../../stzUser/components/Legal/Acknowledgements'

export const Route = createFileRoute('/legal/acknowledgements')({
  component: () => (
    <ReadingContainer>
      <Acknowledgements />
    </ReadingContainer>
  ),
})
