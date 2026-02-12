import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals: { supabase, getClaims } }) => {
	const claims = await getClaims()
	const viewerUserId = claims?.sub as string | undefined

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

	return {
		soldier,
		serviceRecords: serviceRecords ?? [],
		attendanceStats,
		combatRecord,
		assignmentHistory,
		isOwnProfile: soldier.user_id === viewerUserId,
	}
}
