import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { getClaims } }) => {
	const claims = await getClaims()

	if (!claims) {
		redirect(303, '/auth/login')
	}

	return {
		claims,
		// user_role will be populated after plan 01-04 activates the Custom Access Token Hook.
		// Until then, this will be null.
		userRole: (claims['user_role'] as string) ?? null
	}
}
