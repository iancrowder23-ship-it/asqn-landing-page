import { z } from 'zod'

export const grantAwardSchema = z.object({
	award_id: z.string().uuid('Select an award'),
	award_name: z.string().min(1),
	awarded_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
	citation: z.string().min(10, 'Citation must be at least 10 characters').max(2000),
})
