import { error, fail } from '@sveltejs/kit'
import { superValidate, message } from 'sveltekit-superforms'
import { zod4 } from 'sveltekit-superforms/adapters'
import { hasRole } from '$lib/auth/roles'
import { grantQualificationSchema } from '$lib/schemas/grantQualification'
import { grantAwardSchema } from '$lib/schemas/grantAward'
import type { PageServerLoad, Actions } from './$types'

export const load: PageServerLoad = async ({ params, locals: { supabase, getClaims } }) => {
	const claims = await getClaims()
	const viewerUserId = claims?.sub as string | undefined
	const userRole = (claims?.['user_role'] as string) ?? null

	// 1. Fetch soldier profile with rank and unit joins
	const { data: rawSoldier } = await supabase
		.from('soldiers')
		.select(`
      id,
      display_name,
      callsign,
      mos,
      status,
      joined_at,
      user_id,
      ranks ( id, name, abbreviation, sort_order, insignia_url ),
      units ( id, name, abbreviation )
    `)
		.eq('id', params.id)
		.maybeSingle()

	if (!rawSoldier) {
		error(404, 'Soldier not found')
	}

	// Normalize FK joins (established codebase pattern — Supabase types as arrays, runtime is single object)
	type RankRow = {
		id: string
		name: string
		abbreviation: string
		sort_order: number
		insignia_url: string | null
	} | null
	type UnitRow = { id: string; name: string; abbreviation: string | null } | null
	const rank = (Array.isArray(rawSoldier.ranks) ? rawSoldier.ranks[0] : rawSoldier.ranks) as RankRow
	const unit = (Array.isArray(rawSoldier.units) ? rawSoldier.units[0] : rawSoldier.units) as UnitRow

	const soldier = {
		id: rawSoldier.id,
		display_name: rawSoldier.display_name,
		callsign: rawSoldier.callsign,
		mos: rawSoldier.mos,
		status: rawSoldier.status,
		joined_at: rawSoldier.joined_at,
		user_id: rawSoldier.user_id,
		rank,
		unit,
	}

	// 2. Fetch service records (chronological — oldest first)
	// RLS handles visibility: members see own + public, NCO+ see all including leadership_only
	const { data: serviceRecords } = await supabase
		.from('service_records')
		.select('id, action_type, payload, performed_by, visibility, occurred_at')
		.eq('soldier_id', params.id)
		.order('occurred_at', { ascending: true })

	// 3. Fetch attendance stats
	// Count of completed operations (global)
	const { count: totalOpsCount } = await supabase
		.from('operations')
		.select('*', { count: 'exact', head: true })
		.eq('status', 'completed')

	// Count of operations this soldier attended (present only)
	const { count: presentCount } = await supabase
		.from('operation_attendance')
		.select('*', { count: 'exact', head: true })
		.eq('soldier_id', params.id)
		.eq('status', 'present')

	// Last active date: most recent attendance record for this soldier
	const { data: recentAttendance } = await supabase
		.from('operation_attendance')
		.select('created_at')
		.eq('soldier_id', params.id)
		.eq('status', 'present')
		.order('created_at', { ascending: false })
		.limit(1)

	const attendanceStats = {
		operationCount: presentCount ?? 0,
		totalOperations: totalOpsCount ?? 0,
		attendancePercent: totalOpsCount
			? Math.round(((presentCount ?? 0) / totalOpsCount) * 100)
			: null,
		lastActiveDate: recentAttendance?.[0]?.created_at ?? null,
	}

	// 4. Fetch combat record: all operations this soldier participated in, with role held
	// Join operation_attendance with operations to get operation title and date
	const { data: rawCombatRecord } = await supabase
		.from('operation_attendance')
		.select(`
      id,
      status,
      role_held,
      notes,
      created_at,
      operations ( id, title, operation_date, operation_type )
    `)
		.eq('soldier_id', params.id)
		.order('created_at', { ascending: false })

	// Normalize the operations FK join
	const combatRecord = (rawCombatRecord ?? []).map((entry) => {
		const op = Array.isArray(entry.operations) ? entry.operations[0] : entry.operations
		return {
			id: entry.id,
			status: entry.status,
			role_held: entry.role_held,
			notes: entry.notes,
			created_at: entry.created_at,
			operation: op
				? {
						id: op.id,
						title: op.title,
						operation_date: op.operation_date,
						operation_type: op.operation_type,
					}
				: null,
		}
	})

	// 5. Extract unit assignment history from service records (transfer entries)
	const assignmentHistory = (serviceRecords ?? [])
		.filter((r) => r.action_type === 'transfer')
		.map((r) => ({
			occurred_at: r.occurred_at,
			payload: r.payload as Record<string, unknown>,
		}))

	// 6. Fetch available qualifications for grant form (NCO+ only)
	const { data: qualifications } = hasRole(userRole, 'nco')
		? await supabase.from('qualifications').select('id, name, abbreviation, category').order('name')
		: { data: null }

	// 7. Fetch available awards for grant form (Command+ only)
	const { data: awards } = hasRole(userRole, 'command')
		? await supabase.from('awards').select('id, name, abbreviation, award_type').order('precedence')
		: { data: null }

	// 8. Fetch member qualifications for display
	const { data: memberQualifications } = await supabase
		.from('member_qualifications')
		.select('id, awarded_date, expiration_date, status, notes, qualifications ( id, name, abbreviation, badge_url, category )')
		.eq('member_id', params.id)
		.order('awarded_date', { ascending: false })

	// 9. Fetch member awards for display
	const { data: memberAwards } = await supabase
		.from('member_awards')
		.select('id, awarded_date, citation, awards ( id, name, abbreviation, ribbon_url, award_type )')
		.eq('member_id', params.id)
		.order('awarded_date', { ascending: false })

	// 10. Initialize superforms for grant forms
	const grantQualForm = await superValidate(zod4(grantQualificationSchema))
	const grantAwardForm = await superValidate(zod4(grantAwardSchema))

	return {
		soldier,
		serviceRecords: serviceRecords ?? [],
		attendanceStats,
		combatRecord,
		assignmentHistory,
		isOwnProfile: soldier.user_id === viewerUserId,
		userRole,
		qualifications: qualifications ?? [],
		awards: awards ?? [],
		memberQualifications: memberQualifications ?? [],
		memberAwards: memberAwards ?? [],
		grantQualForm,
		grantAwardForm,
	}
}

export const actions: Actions = {
	grantQualification: async ({ params, request, locals: { supabase, getClaims } }) => {
		const claims = await getClaims()
		const userRole = (claims?.['user_role'] as string) ?? null

		if (!hasRole(userRole, 'nco')) {
			return fail(403, { message: 'NCO or higher required' })
		}

		const form = await superValidate(request, zod4(grantQualificationSchema))

		if (!form.valid) {
			return fail(400, { grantQualForm: form })
		}

		const { qualification_id, qualification_name, awarded_date, notes } = form.data

		// Fetch performer display_name for service record payload
		const { data: performer } = await supabase
			.from('soldiers')
			.select('display_name')
			.eq('user_id', claims?.sub as string)
			.maybeSingle()

		const performed_by_name = performer?.display_name ?? 'Unknown'

		// Insert into member_qualifications
		const { error: qualError } = await supabase.from('member_qualifications').insert({
			member_id: params.id,
			qualification_id,
			awarded_by: claims?.sub as string,
			awarded_date,
			notes: notes ?? null,
		})

		if (qualError) {
			console.error('member_qualifications insert error:', qualError)
			return message(form, 'Failed to grant qualification', { status: 500 })
		}

		// Dual-write: insert into service_records
		const { error: srError } = await supabase.from('service_records').insert({
			soldier_id: params.id,
			action_type: 'qualification',
			payload: { qualification_id, qualification_name, notes, performed_by_name },
			performed_by: claims?.sub as string,
			visibility: 'public',
		})

		if (srError) {
			console.error('service_records insert error (qualification):', srError)
			// Non-fatal: qualification already inserted, just log the error
		}

		return message(form, 'Qualification granted successfully')
	},

	grantAward: async ({ params, request, locals: { supabase, getClaims } }) => {
		const claims = await getClaims()
		const userRole = (claims?.['user_role'] as string) ?? null

		if (!hasRole(userRole, 'command')) {
			return fail(403, { message: 'Command or higher required' })
		}

		const form = await superValidate(request, zod4(grantAwardSchema))

		if (!form.valid) {
			return fail(400, { grantAwardForm: form })
		}

		const { award_id, award_name, awarded_date, citation } = form.data

		// Fetch performer display_name for service record payload
		const { data: performer } = await supabase
			.from('soldiers')
			.select('display_name')
			.eq('user_id', claims?.sub as string)
			.maybeSingle()

		const performed_by_name = performer?.display_name ?? 'Unknown'

		// Insert into member_awards
		const { error: awardError } = await supabase.from('member_awards').insert({
			member_id: params.id,
			award_id,
			awarded_by: claims?.sub as string,
			awarded_date,
			citation,
		})

		if (awardError) {
			console.error('member_awards insert error:', awardError)
			return message(form, 'Failed to grant award', { status: 500 })
		}

		// Dual-write: insert into service_records
		const { error: srError } = await supabase.from('service_records').insert({
			soldier_id: params.id,
			action_type: 'award',
			payload: { award_id, award_name, citation, performed_by_name },
			performed_by: claims?.sub as string,
			visibility: 'public',
		})

		if (srError) {
			console.error('service_records insert error (award):', srError)
			// Non-fatal: award already inserted, just log the error
		}

		return message(form, 'Award granted successfully')
	},
}
