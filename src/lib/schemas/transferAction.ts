import { z } from 'zod'

export const transferActionSchema = z.object({
	new_unit_id:   z.string().uuid('Select destination unit'),
	new_unit_name: z.string().min(1),
	from_unit_id:  z.string().uuid().nullable(),
	from_unit_name: z.string().nullable(),
	effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
	reason:        z.string().min(5, 'Reason required').max(500),
})
