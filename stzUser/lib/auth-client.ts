import {twoFactorClient} from "better-auth/client/plugins";
import {createAuthClient} from "better-auth/react";

export const {
	useSession,
	signIn,
	signOut,
	signUp,
	twoFactor,
	forgetPassword,
	resetPassword,
	changeEmail,
	deleteUser,
	sendVerificationEmail,
} =
	createAuthClient({
		baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:3000",
		plugins: [
			twoFactorClient(),
		],
	});
