interface propTypes {
  space?: number;
  orientation?: 'vertical' | 'horizontal';
}

export const Spacer = (props: propTypes) => {
  const {space = 2.5, orientation = 'vertical'} = props;
  // const direction = orientation === 'vertical' ? 'borderRightWidth' : 'borderBottomWidth'
  return orientation === 'vertical' ?
    <hr
      style={{
        height: `${space}rem`,
        color: 'transparent',
        backgroundColor: 'transparent',
        margin: '0',
        // flexGrow: '1'
      }}
    /> :
    <div style={{minWidth: `${space}rem`, flexGrow: '1'}} />
}
