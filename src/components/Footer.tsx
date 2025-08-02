import { DeveloperTools } from './DeveloperTools'

export const Footer = () => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '0rem',
        left: '0',
        width: '100%',
        height: '3rem',
      }}
    >
      <main>
        <section
          style={{
            display: 'flex',
            backgroundColor: 'var(--color-bg)', // make it opaque
            justifyContent: 'space-between',
            alignContent: 'center',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '0.8rem',
                marginTop: '4px', // why needed to align with the link?
              }}
            >
              Built with React, TanStack Start, Better-Auth, Valibot, NodeMailer and MVP.css
            </p>
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              marginTop: '-17px', // why needed to align with the link?
            }}
          >
            <DeveloperTools
              detailItemsStyleAttribute={{
                position: 'absolute',
                top: '-20rem',
                left: '50%',
              }}
            />
          </div>
          <div>
            <a
              style={{
                fontSize: '0.8rem',
                textWrap: 'nowrap',
                fontWeight: '400',
                textDecoration: 'none',
              }}
              href="https://www.flaticon.com/free-icons/ecology"
              title="landscape icons"
            >
              Ecology icon by Maan Icons - Flaticon
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}