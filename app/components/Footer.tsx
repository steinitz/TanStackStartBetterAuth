export const Footer = () => {
  return(
    <section
      style={{
        display: 'flex',
        width: '100%',
        height: '3rem',
        position: 'fixed',
        bottom: '0',
        backgroundColor: 'var(--color-bg)',
        justifyContent: 'flex-start',
      }}
    >
      <div
        style={{
          width: '70%',
          display: 'flex',
          justifyContent: 'space-between',
          flexDirection: 'row',
        }}
      >
      <p
        style={{
          fontSize: '0.8rem',
          marginTop: '0'
        }}
      >
        Built with React, TanStack Start, Better-Auth, NodeMailer and MVP.css
      </p>
      <a
        style={{
          fontSize: '0.8rem',
          minWidth: '300px',
        }}
        href="https://www.flaticon.com/free-icons/landscape"
        title="landscape icons"
      >
        Landscape icons created by Nuricon - Flaticon
      </a>
      </div>
    </section>
  )
}
