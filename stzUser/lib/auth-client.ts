import {adminClient} from "better-auth/client/plugins";
import {createAuthClient} from "better-auth/react";

export const {
	useSession,
	signIn,
	signOut,
	signUp,
	forgetPassword,
	resetPassword,
	changeEmail,
	deleteUser,
	sendVerificationEmail,
	admin,
} =
	createAuthClient({
		baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:3000",
		plugins: [
			adminClient(),
		],
	});
