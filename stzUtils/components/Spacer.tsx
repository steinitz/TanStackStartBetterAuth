interface SpacerProps {
  space?: number
  orientation?: 'vertical' | 'horizontal'
}

export const Spacer = (props: SpacerProps) => {
  const { space = 2.0, orientation = 'vertical' } = props
  
  return orientation === 'vertical' ? (
    <hr
      style={{
        height: `${space}rem`,
        color: 'transparent',
        backgroundColor: 'transparent',
        margin: '0',
      }}
    />
  ) : (
    <div style={{ minWidth: `${space}rem`, flexGrow: '1' }} />
  )
}