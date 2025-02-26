import {Link} from "@tanstack/react-router";
import {UserBlock} from "~/components/userBlock";
import { Spacer } from "./Spacer";

export const Header = () => {
  return(
    <section
      style={{
        display: 'flex',
        width: '100%',
        // height: '5rem',
        backgroundColor: 'var(--color-bg)',
        justifyContent: 'space-between',
        flexDirection: 'row',
      }}
    >
      {/*<div*/}
      {/*  style={{*/}
      {/*    width: '70%',*/}
      {/*    display: 'flex',*/}
      {/*    justifyContent: 'space-between',*/}
      {/*    flexDirection: 'row',*/}
      {/*  }}*/}
      {/*>*/}
        <Link
          style={{
            // ...adjustVerticalLocationStyle,
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
        <UserBlock />
      {/*</div>*/}
    </section>
  )
}
