import {
  parseAdminUserIds,
  parseFirstUserIsAdmin,
} from './admin-identity'

// Parse the effective admin configuration once at server-module load.
export const adminUserIds = parseAdminUserIds(process.env.ADMIN_USER_IDS)
export const firstUserIsAdmin = parseFirstUserIsAdmin(process.env.FIRST_USER_IS_ADMIN)
