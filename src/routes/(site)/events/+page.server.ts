import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: events } = await supabase
		.from('events')
		.select('id, title, description, event_date, event_type, status')
		.eq('status', 'scheduled')
		.order('event_date', { ascending: true })

	return { events: events ?? [] }
}
