import { redirect } from '@sveltejs/kit'
import { hasRole } from '$lib/auth/roles'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase, getClaims } }) => {
	const claims = await getClaims()
	const userRole = (claims?.['user_role'] as string) ?? null

	if (!hasRole(userRole, 'nco')) {
		redirect(303, '/dashboard')
	}

	// Fetch non-terminal applications ordered by submitted_at ascending (oldest first)
	const { data: applications } = await supabase
		.from('enlistments')
		.select(
			'id, display_name, discord_username, age, timezone, arma_experience, why_join, referred_by, notes, status, submitted_at, reviewed_at, reviewed_by, soldier_id'
		)
		.not('status', 'in', '("accepted","rejected")')
		.order('submitted_at', { ascending: true })

	// Fetch all applications (id + status only) for count badges
	const { data: allApplications } = await supabase
		.from('enlistments')
		.select('id, status')

	return {
		applications: applications ?? [],
		allApplications: allApplications ?? [],
		userRole,
	}
}
