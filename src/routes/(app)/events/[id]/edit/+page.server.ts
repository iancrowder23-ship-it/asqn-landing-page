import { error, fail, redirect } from '@sveltejs/kit'
import { superValidate, message } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { hasRole } from '$lib/auth/roles'
import { editEventSchema, EVENT_STATUSES } from '$lib/schemas/editEvent'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ params, locals: { supabase, getClaims } }) => {
	const claims = await getClaims()
	const userRole = (claims?.['user_role'] as string) ?? null

	if (!hasRole(userRole, 'nco')) {
		redirect(303, '/events')
	}

	const { data: event } = await supabase
		.from('events')
		.select('id, title, description, event_date, event_type, status')
		.eq('id', params.id)
		.maybeSingle()

	if (!event) {
		error(404, 'Event not found')
	}

	// Convert stored ISO timestamptz to datetime-local format (YYYY-MM-DDTHH:MM)
	const eventDateLocal = new Date(event.event_date).toISOString().slice(0, 16)

	const form = await superValidate(
		{
			title: event.title,
			description: event.description ?? '',
			event_date: eventDateLocal,
			event_type: event.event_type as 'operation' | 'training' | 'ftx',
			status: event.status as 'scheduled' | 'completed' | 'cancelled',
		},
		zod4(editEventSchema),
		{ errors: false }
	)

	return {
		form,
		event,
		eventStatuses: EVENT_STATUSES,
	}
}

export const actions: Actions = {
	default: async ({ params, request, locals: { supabase, getClaims } }) => {
		const claims = await getClaims()
		const userRole = (claims?.['user_role'] as string) ?? null

		if (!hasRole(userRole, 'nco')) {
			return fail(403, { message: 'NCO or higher required' })
		}

		const form = await superValidate(request, zod4(editEventSchema))

		if (!form.valid) {
			return fail(400, { form })
		}

		const { title, description, event_date, event_type, status } = form.data

		const { error: updateError } = await supabase
			.from('events')
			.update({
				title,
				description: description ?? null,
				event_date,
				event_type,
				status,
			})
			.eq('id', params.id)

		if (updateError) {
			console.error('events update error:', updateError)
			return message(form, 'Failed to update event', { status: 500 })
		}

		redirect(303, '/events')
	},
}
