import { redirect } from '@sveltejs/kit'
import { hasRole } from '$lib/auth/roles'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase, getClaims } }) => {
	const claims = await getClaims()
	const userRole = (claims?.['user_role'] as string) ?? null

	if (!hasRole(userRole, 'nco')) {
		redirect(303, '/dashboard')
	}

	const { data: operations } = await supabase
		.from('operations')
		.select('id, title, operation_date, operation_type, status, description, created_at')
		.order('operation_date', { ascending: false })

	return {
		operations: operations ?? [],
		userRole,
	}
}
