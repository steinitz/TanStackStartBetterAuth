import {Link, useRouterState} from "@tanstack/react-router";
import {UserBlock} from "~stzUser/components/userBlock";
import {Spacer} from "~stzUtils/components/Spacer";

export const Header = () => {
  const router = useRouterState()

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
      <UserBlock/>
    </section>
  )
}