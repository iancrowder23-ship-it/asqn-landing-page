import { superValidate, message } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { fail } from '@sveltejs/kit'
import { enlistmentSchema } from '$lib/schemas/enlistment'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(enlistmentSchema))
	return { form }
}

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const form = await superValidate(request, zod4(enlistmentSchema))

		if (!form.valid) {
			return fail(400, { form })
		}

		const { error } = await supabase.from('enlistments').insert({
			display_name: form.data.display_name,
			discord_username: form.data.discord_username,
			age: form.data.age,
			timezone: form.data.timezone,
			arma_experience: form.data.arma_experience,
			why_join: form.data.why_join,
			referred_by: form.data.referred_by || null,
			status: 'pending'
		})

		if (error) {
			console.error('Enlistment insert error:', error)
			return message(form, 'Submission failed. Please try again later.', { status: 500 })
		}

		return message(
			form,
			'Application submitted successfully! We will contact you on Discord within 48 hours.'
		)
	}
}
