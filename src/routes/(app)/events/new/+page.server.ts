import { fail, redirect } from '@sveltejs/kit'
import { superValidate, message } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { hasRole } from '$lib/auth/roles'
import { createEventSchema, EVENT_TYPES } from '$lib/schemas/createEvent'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ locals: { getClaims } }) => {
	const claims = await getClaims()
	const userRole = (claims?.['user_role'] as string) ?? null

	if (!hasRole(userRole, 'nco')) {
		redirect(303, '/events')
	}

	const form = await superValidate(zod4(createEventSchema))

	return {
		form,
		eventTypes: EVENT_TYPES,
	}
}

export const actions: Actions = {
	default: async ({ request, locals: { supabase, getClaims } }) => {
		const claims = await getClaims()
		const userRole = (claims?.['user_role'] as string) ?? null

		if (!hasRole(userRole, 'nco')) {
			return fail(403, { message: 'NCO or higher required' })
		}

		const form = await superValidate(request, zod4(createEventSchema))

		if (!form.valid) {
			return fail(400, { form })
		}

		const { title, description, event_date, event_type } = form.data

		const { error: insertError } = await supabase.from('events').insert({
			title,
			description: description ?? null,
			event_date,
			event_type,
			status: 'scheduled',
			created_by: claims?.sub as string,
		})

		if (insertError) {
			console.error('events insert error:', insertError)
			return message(form, 'Failed to create event', { status: 500 })
		}

		redirect(303, '/events')
	},
}
