import { Link } from "@tanstack/react-router";
import { UserBlock, navLinkStyle } from "~stzUser/components/Other/userBlock";
import { Spacer } from "~stzUtils/components/Spacer";

export const Header = () => {

  return (
    <section
      style={{
        display: 'flex',
        width: '100%',
        backgroundColor: 'var(--color-bg)',
        flexDirection: 'row',
        marginBottom: '-13px',
        alignItems: 'center',
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
      <Spacer orientation={'horizontal'} space={1} />
      <Link
        to="/other"
        style={navLinkStyle}
      >
        Other
      </Link>
      <Spacer orientation={'horizontal'} space={1} />
      <UserBlock />
    </section>
  )
}