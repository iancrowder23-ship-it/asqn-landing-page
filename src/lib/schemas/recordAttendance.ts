import { z } from 'zod'

export const ATTENDANCE_STATUSES = ['present', 'excused', 'absent'] as const

export const recordAttendanceSchema = z.object({
	soldier_id: z.string().uuid(),
	status: z.enum(ATTENDANCE_STATUSES),
	role_held: z.string().max(100).optional(),
	notes: z.string().max(500).optional(),
})
