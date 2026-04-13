import {adminClient} from "better-auth/client/plugins";
import {oneTimeTokenClient} from "better-auth/client/plugins";
import {createAuthClient} from "better-auth/react";
import { clientEnv } from "./env";

export const {
	useSession,
	signIn,
	signOut,
	signUp,
	requestPasswordReset,
	resetPassword,
	changeEmail,
	changePassword,
	deleteUser,
	sendVerificationEmail,
	admin,
	oneTimeToken,
	verifyEmail,
} =
	createAuthClient({
		// Use window.location.origin at runtime so each client POSTs to the server
		// it actually loaded from — localhost on the Mac dev machine, a LAN IP on
		// another device (e.g. iPad), or the production domain.
		//
		// Fixed a dev server issue: when accessing the Mac dev server from a remote
		// device (e.g. iPad on the same WiFi), clientEnv.BETTER_AUTH_BASE_URL was
		// set to https://localhost:3000. The iPad's browser resolved 'localhost'
		// to itself, not the Mac — so auth POSTs went to the iPad's own loopback.
		// Nothing listened, nothing errored, nothing logged. Total silent sign-in failure.
		//
		// Fallback to BETTER_AUTH_BASE_URL for SSR (typeof window === 'undefined')
		// and for E2E test scripts.  BETTER_AUTH_BASE_URL is still needed for those
		// server-side contexts.
		//
		// Edge case: this approach assumes auth is same-origin (same host as the
		// frontend).  It would break if auth were hosted on a separate domain.
		baseURL: typeof window !== 'undefined' ? window.location.origin : clientEnv.BETTER_AUTH_BASE_URL,
		plugins: [
			adminClient(),
			oneTimeTokenClient(),
		],
	});
