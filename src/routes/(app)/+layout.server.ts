import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals: { supabase, getClaims } }) => {
	const claims = await getClaims()

	if (!claims) {
		redirect(303, '/auth/login')
	}

	const userRole = (claims['user_role'] as string) ?? null

	// Look up the current user's soldier record for "My Profile" nav link
	const { data: mySoldier } = await supabase
		.from('soldiers')
		.select('id')
		.eq('user_id', claims.sub as string)
		.maybeSingle()

	return {
		claims,
		userRole,
		mySoldierId: mySoldier?.id ?? null,
	}
}
