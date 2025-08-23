import {adminClient} from "better-auth/client/plugins";
import {oneTimeTokenClient} from "better-auth/client/plugins";
import {createAuthClient} from "better-auth/react";
import { clientEnv } from "./env";

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
	oneTimeToken,
	verifyEmail,
} =
	createAuthClient({
		baseURL: clientEnv.BETTER_AUTH_BASE_URL,
		plugins: [
			adminClient(),
			oneTimeTokenClient(),
		],
	});
