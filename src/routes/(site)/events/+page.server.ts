import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: events } = await supabase
		.from('events')
		.select('id, title, description, event_date, event_type, status')
		.eq('status', 'scheduled')
		.gte('event_date', new Date().toISOString())
		.order('event_date', { ascending: true })

	return { events: events ?? [] }
}
