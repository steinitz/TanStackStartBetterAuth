import {Link} from "@tanstack/react-router";
import {UserBlock} from "~stzUser/components/Other/userBlock";
import {Spacer} from "~stzUtils/components/Spacer";

export const Header = () => {

  return(
    <section
      style={{
        display: 'flex',
        width: '100%',
        backgroundColor: 'var(--color-bg)',
        flexDirection: 'row',
        marginBottom: '-13px',
      }}
    >
      <Link
        style={{
          marginRight: '21px',
        }}
        to="/"
      >
        <img
          style={{
            width: '55px',
            height: '55px',
          }}
          src="/logo.png"
          alt="logo"
        />
      </Link>
      <Spacer orientation={'horizontal'} space={1}/>
      <Link
        to="/contact"
        style={{
          textDecoration: 'none',
          color: 'var(--color-text)',
          padding: '8px 16px',
          borderRadius: '4px',
          transition: 'background-color 0.2s',
          alignSelf: 'center',
          marginRight: '16px',
        }}
        activeProps={{
          style: {
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-bg)',
          },
        }}
      >
        Contact
      </Link>
      <UserBlock/>
    </section>
  )
}