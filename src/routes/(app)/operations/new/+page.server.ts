import { redirect } from '@sveltejs/kit'
import { superValidate, message } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { hasRole } from '$lib/auth/roles'
import { createOperationSchema, OPERATION_TYPES } from '$lib/schemas/createOperation'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ locals: { getClaims } }) => {
	const claims = await getClaims()
	const userRole = (claims?.['user_role'] as string) ?? null

	if (!hasRole(userRole, 'nco')) {
		redirect(303, '/dashboard')
	}

	const form = await superValidate(zod4(createOperationSchema))

	return {
		form,
		operationTypes: OPERATION_TYPES,
		userRole,
	}
}

export const actions: Actions = {
	default: async ({ request, locals: { supabase, getClaims } }) => {
		const claims = await getClaims()
		const userRole = (claims?.['user_role'] as string) ?? null

		if (!hasRole(userRole, 'nco')) {
			redirect(303, '/dashboard')
		}

		const form = await superValidate(request, zod4(createOperationSchema))

		if (!form.valid) {
			return { form }
		}

		const { title, operation_date, operation_type, status, description } = form.data

		const { error: insertError } = await supabase.from('operations').insert({
			title,
			operation_date,
			operation_type,
			status,
			description: description ?? null,
			created_by: claims?.sub as string,
		})

		if (insertError) {
			console.error('operations insert error:', insertError)
			return message(form, 'Failed to create operation', { status: 500 })
		}

		redirect(303, '/operations')
	},
}
