import {Link, useRouterState} from "@tanstack/react-router";
import {adjustVerticalLocationStyle, UserBlock} from "~/components/userBlock";
import {Spacer} from "./Spacer";
import {routeStrings} from "~/constants";
import {activeLinkStyle} from "~/components/styles";

export const Header = () => {
  const router = useRouterState()

  // const isContactFormRoute = router.location.pathname === routeStrings.signin

  return(
    <section
      style={{
        display: 'flex',
        width: '100%',
        // height: '5rem',
        backgroundColor: 'var(--color-bg)',
        // justifyContent: 'space-between',
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
      <Link
        style={{
          ...adjustVerticalLocationStyle(),
        }}
        to="/contact"
        activeProps={{
          style: activeLinkStyle
        }}
      >
        Support
      </Link>
    </section>
  )
}
