import { error, fail, redirect } from '@sveltejs/kit'
import { superValidate, message } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { hasRole } from '$lib/auth/roles'
import { recordAttendanceSchema, ATTENDANCE_STATUSES } from '$lib/schemas/recordAttendance'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ params, locals: { supabase, getClaims } }) => {
	const claims = await getClaims()
	const userRole = (claims?.['user_role'] as string) ?? null

	if (!hasRole(userRole, 'nco')) {
		redirect(303, '/dashboard')
	}

	// 1. Fetch the operation
	const { data: operation } = await supabase
		.from('operations')
		.select('id, title, operation_date, operation_type, status, description')
		.eq('id', params.id)
		.maybeSingle()

	if (!operation) {
		error(404, 'Operation not found')
	}

	// 2. Fetch active/LOA soldiers for attendance roster (exclude discharged, retired, inactive)
	const { data: soldiers } = await supabase
		.from('soldiers')
		.select('id, display_name, callsign, status, ranks(abbreviation)')
		.not('status', 'in', '("discharged","retired","inactive")')
		.order('display_name')

	// 3. Fetch existing attendance for this operation
	const { data: attendanceRows } = await supabase
		.from('operation_attendance')
		.select('id, soldier_id, status, role_held, notes, recorded_by')
		.eq('operation_id', params.id)

	// 4. Build a map of existing attendance by soldier_id for easy lookup
	const existingAttendance: Record<string, { id: string; status: string; role_held: string | null; notes: string | null }> = {}
	for (const row of attendanceRows ?? []) {
		existingAttendance[row.soldier_id] = {
			id: row.id,
			status: row.status,
			role_held: row.role_held,
			notes: row.notes,
		}
	}

	// 5. Create a superValidate form instance for attendance
	const form = await superValidate(zod4(recordAttendanceSchema))

	return {
		operation,
		soldiers: soldiers ?? [],
		existingAttendance,
		form,
		attendanceStatuses: ATTENDANCE_STATUSES,
		userRole,
	}
}

export const actions: Actions = {
	recordAttendance: async ({ params, request, locals: { supabase, getClaims } }) => {
		const claims = await getClaims()
		const userRole = (claims?.['user_role'] as string) ?? null

		if (!hasRole(userRole, 'nco')) {
			return fail(403, { message: 'NCO or higher required' })
		}

		const form = await superValidate(request, zod4(recordAttendanceSchema))

		if (!form.valid) {
			return fail(400, { form })
		}

		const { error: upsertError } = await supabase
			.from('operation_attendance')
			.upsert(
				{
					soldier_id: form.data.soldier_id,
					operation_id: params.id,
					status: form.data.status,
					role_held: form.data.role_held ?? null,
					notes: form.data.notes ?? null,
					recorded_by: claims?.sub as string,
				},
				{ onConflict: 'soldier_id,operation_id' }
			)

		if (upsertError) {
			console.error('operation_attendance upsert error:', upsertError)
			return message(form, 'Failed to record attendance', { status: 500 })
		}

		return message(form, 'Attendance recorded')
	},
}
