import { error, fail, redirect } from '@sveltejs/kit'
import { superValidate, message } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { hasRole } from '$lib/auth/roles'
import { isValidTransition } from '$lib/enlistment-transitions'
import { advanceEnlistmentSchema } from '$lib/schemas/advanceEnlistment'
import { acceptEnlistmentSchema } from '$lib/schemas/acceptEnlistment'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ params, locals: { supabase, getClaims } }) => {
	const claims = await getClaims()
	const userRole = (claims?.['user_role'] as string) ?? null

	if (!hasRole(userRole, 'nco')) {
		redirect(303, '/dashboard')
	}

	// Fetch single enlistment by id
	const { data: application } = await supabase
		.from('enlistments')
		.select(
			'id, display_name, discord_username, age, timezone, arma_experience, why_join, referred_by, notes, status, submitted_at, reviewed_at, reviewed_by, soldier_id'
		)
		.eq('id', params.id)
		.maybeSingle()

	if (!application) {
		error(404, 'Application not found')
	}

	// Fetch available ranks for accept form
	const { data: ranks } = await supabase
		.from('ranks')
		.select('id, name, abbreviation, sort_order')
		.order('sort_order', { ascending: true })

	// Fetch available units for accept form
	const { data: units } = await supabase
		.from('units')
		.select('id, name, abbreviation')
		.order('name', { ascending: true })

	const advanceForm = await superValidate(zod4(advanceEnlistmentSchema))
	const acceptForm = await superValidate(zod4(acceptEnlistmentSchema))

	return {
		application,
		ranks: ranks ?? [],
		units: units ?? [],
		advanceForm,
		acceptForm,
		userRole,
	}
}

export const actions: Actions = {
	advance: async ({ params, request, locals: { supabase, getClaims } }) => {
		const claims = await getClaims()
		const userRole = (claims?.['user_role'] as string) ?? null

		if (!hasRole(userRole, 'command')) {
			return fail(403, { message: 'Command or higher required' })
		}

		const form = await superValidate(request, zod4(advanceEnlistmentSchema))

		if (!form.valid) {
			return fail(400, { advanceForm: form })
		}

		// Fetch current DB status (not from client data)
		const { data: current } = await supabase
			.from('enlistments')
			.select('status')
			.eq('id', params.id)
			.maybeSingle()

		if (!current) {
			return message(form, 'Application not found', { status: 404 })
		}

		if (!isValidTransition(current.status, form.data.target_status)) {
			return message(
				form,
				`Cannot advance from "${current.status}" to "${form.data.target_status}"`,
				{ status: 400 }
			)
		}

		const { error: updateError } = await supabase
			.from('enlistments')
			.update({
				status: form.data.target_status,
				reviewed_at: new Date().toISOString(),
				reviewed_by: claims?.sub as string,
			})
			.eq('id', params.id)

		if (updateError) {
			console.error('enlistments update error:', updateError)
			return message(form, 'Failed to advance application status', { status: 500 })
		}

		return message(form, `Status updated successfully`)
	},

	acceptApplication: async ({ params, request, locals: { supabase, getClaims } }) => {
		const claims = await getClaims()
		const userRole = (claims?.['user_role'] as string) ?? null

		if (!hasRole(userRole, 'command')) {
			return fail(403, { message: 'Command or higher required' })
		}

		const form = await superValidate(request, zod4(acceptEnlistmentSchema))

		if (!form.valid) {
			return fail(400, { acceptForm: form })
		}

		// Fetch current enlistment from DB
		const { data: enlistment } = await supabase
			.from('enlistments')
			.select('id, display_name, discord_username, status, soldier_id')
			.eq('id', params.id)
			.maybeSingle()

		if (!enlistment) {
			return message(form, 'Application not found', { status: 404 })
		}

		if (!isValidTransition(enlistment.status, 'accepted')) {
			return message(
				form,
				`Cannot accept application in status "${enlistment.status}"`,
				{ status: 400 }
			)
		}

		// Idempotency check: if soldier_id already set, just ensure status is accepted and redirect
		if (enlistment.soldier_id) {
			await supabase
				.from('enlistments')
				.update({
					status: 'accepted',
					reviewed_at: new Date().toISOString(),
					reviewed_by: claims?.sub as string,
				})
				.eq('id', params.id)

			redirect(303, `/enlistments/${params.id}`)
		}

		// Fetch performer display_name for service record
		const { data: performer } = await supabase
			.from('soldiers')
			.select('display_name')
			.eq('user_id', claims?.sub as string)
			.maybeSingle()

		const performed_by_name = performer?.display_name ?? 'Unknown'

		// Create soldier record
		// IMPORTANT: do NOT set discord_id — enlistment discord_username is a display string, not a snowflake ID
		const { data: newSoldier, error: soldierError } = await supabase
			.from('soldiers')
			.insert({
				display_name: enlistment.display_name,
				status: 'active',
				rank_id: form.data.rank_id,
				unit_id: form.data.unit_id ?? null,
			})
			.select('id')
			.single()

		if (soldierError || !newSoldier) {
			console.error('soldiers insert error:', soldierError)
			return message(form, 'Failed to create soldier profile', { status: 500 })
		}

		// Write service record (non-fatal if fails)
		const { error: srError } = await supabase.from('service_records').insert({
			soldier_id: newSoldier.id,
			action_type: 'enlistment',
			payload: {
				enlistment_id: params.id,
				display_name: enlistment.display_name,
				performed_by_name,
			},
			performed_by: claims?.sub as string,
			visibility: 'public',
		})

		if (srError) {
			console.error('service_records insert error (enlistment):', srError)
			// Non-fatal: soldier already created, just log the error
		}

		// Update enlistment with accepted status + soldier_id (idempotency)
		const { error: updateError } = await supabase
			.from('enlistments')
			.update({
				status: 'accepted',
				reviewed_at: new Date().toISOString(),
				reviewed_by: claims?.sub as string,
				soldier_id: newSoldier.id,
			})
			.eq('id', params.id)

		if (updateError) {
			console.error('enlistments update error (accept):', updateError)
			return message(form, 'Soldier created but failed to update application status', { status: 500 })
		}

		return message(form, `${enlistment.display_name} has been accepted. Soldier profile created.`)
	},

	reject: async ({ params, request, locals: { supabase, getClaims } }) => {
		const claims = await getClaims()
		const userRole = (claims?.['user_role'] as string) ?? null

		if (!hasRole(userRole, 'command')) {
			return fail(403, { message: 'Command or higher required' })
		}

		// Fetch current status from DB
		const { data: current } = await supabase
			.from('enlistments')
			.select('status')
			.eq('id', params.id)
			.maybeSingle()

		if (!current) {
			return fail(404, { message: 'Application not found' })
		}

		if (!isValidTransition(current.status, 'rejected')) {
			return fail(400, { message: `Cannot reject application in status "${current.status}"` })
		}

		const { error: updateError } = await supabase
			.from('enlistments')
			.update({
				status: 'rejected',
				reviewed_at: new Date().toISOString(),
				reviewed_by: claims?.sub as string,
			})
			.eq('id', params.id)

		if (updateError) {
			console.error('enlistments update error (reject):', updateError)
			return fail(500, { message: 'Failed to reject application' })
		}

		return { success: true, message: 'Application has been denied.' }
	},
}
