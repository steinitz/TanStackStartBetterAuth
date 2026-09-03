// user roles
export const userRoles = {
  admin: 'admin',
  user: 'user',
}

export const minPasswordLength = 8

/**
 * What assistive technology calls the header's logo link.
 *
 * It names where the link GOES rather than the picture it shows. Announced as "logo" it told
 * a screen reader what the thing was and never where it led, which is the one fact somebody
 * navigating by link name actually needs.
 *
 * Exported because `smoke-navigation.spec.ts` finds the link by this name. A copy of the
 * string in the spec would go on matching nothing, quietly, the day the name changed. It
 * lives here rather than beside the Header because the spec is shared between repositories
 * and each one keeps its own `src/components/Header.tsx`.
 */
export const homeLinkName = 'Home'

export type userRolesType = keyof typeof userRoles