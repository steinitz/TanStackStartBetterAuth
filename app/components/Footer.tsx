import { Spacer } from "./Spacer"

export const Footer = () => {
  return(
    <section
      style={{
        // display: 'flex',
        width: '100%',
        height: '3rem',
        justifyContent: 'space-between',
        flexDirection: 'row',
        position: 'fixed',
        bottom: '0',
        backgroundColor: 'var(--color-bg)',
        // margin: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          flexDirection: 'row',
          margin: 'auto'
        }}
      >
        <p
          style={{
            fontSize: '0.8rem',
            margin: '0',
            flexGrow: '1'
          }}
        >
          Built with React, TanStack Start, Better-Auth, Valibot,NodeMailer and MVP.css
        </p>
        {/* Why do I need the space?  Why doesnt slex work? */}
        <Spacer orientation="horizontal" space={1} />
        <a
          style={{
            fontSize: '0.8rem',
            textAlign: 'right',
            // minWidth: '250px',
            textWrap: 'nowrap',
          }}
          href="https://www.flaticon.com/free-icons/landscape"
          title="landscape icons"
        >
          Landscape icon by Nuricon - Flaticon
        </a>
         <Spacer orientation="horizontal" space={1} />
        <p
          style={{
            fontSize: '0.8rem',
            margin: '0',
            flexGrow: '1'
          }}
        >
         test
        </p>
      </div>
    </section>
  )
}
