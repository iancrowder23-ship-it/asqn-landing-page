import { hasRole } from '$lib/auth/roles'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase, getClaims } }) => {
	const claims = await getClaims()
	const userRole = (claims?.['user_role'] as string) ?? null

	const { data: events } = await supabase
		.from('events')
		.select('id, title, description, event_date, event_type, status, created_at')
		.order('event_date', { ascending: false })

	return {
		events: events ?? [],
		userRole,
	}
}
