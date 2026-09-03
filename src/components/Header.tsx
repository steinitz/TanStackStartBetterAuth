import { Link } from "@tanstack/react-router";
import { UserBlock, navLinkStyle } from "~stzUser/components/Other/userBlock";
import { Spacer } from "~stzUtils/components/Spacer";
import { activeLinkStyle } from "~stzUtils/components/styles";
import { homeLinkName } from "~stzUser/constants";

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
        justifyContent: 'space-between',
      }}
    >
      <Link
        style={{
          marginRight: '21px',
        }}
        to="/"
        // The name is on the link, and the image is left decorative, so the link is announced
        // once and by its destination. See homeLinkName for why it is not "logo".
        aria-label={homeLinkName}
      >
        <img
          style={{
            width: '55px',
            height: '55px',
          }}
          src="/logo.png"
          alt=""
        />
      </Link>
      <Spacer orientation={'horizontal'} space={1} />
      <Link
        to="/other"
        style={navLinkStyle}
        activeProps={{
          style: { ...navLinkStyle, ...activeLinkStyle }
        }}
      >
        Other
      </Link>
      <Spacer orientation={'horizontal'} space={1} />
      <Link
        to="/legal/pricing"
        style={navLinkStyle}
        activeProps={{
          style: { ...navLinkStyle, ...activeLinkStyle }
        }}
      >
        Pricing
      </Link>
      <Spacer orientation={'horizontal'} space={1} />
      <UserBlock />
    </section>
  )
}