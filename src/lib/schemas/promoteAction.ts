import { z } from 'zod'

export const promoteActionSchema = z.object({
	new_rank_id:   z.string().uuid('Select new rank'),
	new_rank_name: z.string().min(1),
	from_rank_id:  z.string().uuid(),
	from_rank_name: z.string().min(1),
	reason:        z.string().min(5, 'Reason must be at least 5 characters').max(500),
})
