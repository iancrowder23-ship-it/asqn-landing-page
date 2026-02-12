import { hasRole } from '$lib/auth/roles'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase, getClaims } }) => {
	const claims = await getClaims()
	const userRole = (claims?.['user_role'] as string) ?? null

	// Basic data for ALL authenticated users: upcoming scheduled events
	const { data: upcomingEvents } = await supabase
		.from('events')
		.select('id, title, event_date, event_type, status')
		.eq('status', 'scheduled')
		.gte('event_date', new Date().toISOString())
		.order('event_date', { ascending: true })
		.limit(5)

	const isCommand = hasRole(userRole, 'command')

	if (!isCommand) {
		return {
			userRole,
			upcomingEvents: upcomingEvents ?? [],
			metrics: null,
			recentActions: null,
			attendanceTrends: null,
		}
	}

	// Full metrics for Command+ only — all queries fired in parallel
	const [
		{ count: activeCount },
		{ count: loaCount },
		{ count: awolCount },
		{ count: pendingAppsCount },
		{ data: rawRecentActions },
		{ data: recentOpsRaw },
		{ data: attendanceRaw },
	] = await Promise.all([
		supabase.from('soldiers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
		supabase.from('soldiers').select('*', { count: 'exact', head: true }).eq('status', 'loa'),
		supabase.from('soldiers').select('*', { count: 'exact', head: true }).eq('status', 'awol'),
		supabase
			.from('enlistments')
			.select('*', { count: 'exact', head: true })
			.not('status', 'in', '("accepted","rejected")'),
		supabase
			.from('service_records')
			.select('id, action_type, payload, occurred_at, soldiers ( id, display_name )')
			.order('occurred_at', { ascending: false })
			.limit(10),
		supabase
			.from('operations')
			.select('id, title, operation_date, operation_type, status')
			.eq('status', 'completed')
			.order('operation_date', { ascending: false })
			.limit(10),
		supabase.from('operation_attendance').select('operation_id, status'),
	])

	// Normalize recentActions FK join (established codebase pattern)
	const recentActions = (rawRecentActions ?? []).map((r) => {
		const soldier = Array.isArray(r.soldiers) ? r.soldiers[0] : r.soldiers
		return {
			id: r.id,
			action_type: r.action_type as string,
			payload: r.payload as Record<string, unknown>,
			occurred_at: r.occurred_at,
			soldier_name: soldier?.display_name ?? 'Unknown',
			soldier_id: soldier?.id ?? null,
		}
	})

	// Compute attendance trends: group attendance by operation_id, then annotate each op
	const attendanceByOp = new Map<string, { present: number; excused: number; absent: number }>()
	for (const row of attendanceRaw ?? []) {
		if (!row.operation_id) continue
		const existing = attendanceByOp.get(row.operation_id) ?? { present: 0, excused: 0, absent: 0 }
		if (row.status === 'present') existing.present++
		else if (row.status === 'excused') existing.excused++
		else if (row.status === 'absent') existing.absent++
		attendanceByOp.set(row.operation_id, existing)
	}

	const attendanceTrends = (recentOpsRaw ?? []).map((op) => {
		const counts = attendanceByOp.get(op.id) ?? { present: 0, excused: 0, absent: 0 }
		const total = counts.present + counts.excused + counts.absent
		const percentage = total > 0 ? Math.round((counts.present / total) * 100) : 0
		return {
			operation: {
				id: op.id,
				title: op.title,
				operation_date: op.operation_date,
				operation_type: op.operation_type,
			},
			present: counts.present,
			excused: counts.excused,
			absent: counts.absent,
			total,
			percentage,
		}
	})

	return {
		userRole,
		upcomingEvents: upcomingEvents ?? [],
		metrics: {
			activeCount: activeCount ?? 0,
			loaCount: loaCount ?? 0,
			awolCount: awolCount ?? 0,
			pendingAppsCount: pendingAppsCount ?? 0,
		},
		recentActions,
		attendanceTrends,
	}
}
