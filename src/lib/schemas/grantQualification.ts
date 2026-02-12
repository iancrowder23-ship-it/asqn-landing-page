import { z } from 'zod'

export const grantQualificationSchema = z.object({
	qualification_id: z.string().uuid('Select a qualification'),
	qualification_name: z.string().min(1),
	awarded_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
	notes: z.string().max(500).optional(),
})
