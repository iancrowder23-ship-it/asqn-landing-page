import type { PageServerLoad } from './$types'

const PAY_GRADE_MAP: Record<number, string> = {
	1: 'E-1',
	2: 'E-2',
	3: 'E-3',
	4: 'E-4 (SPC)',
	5: 'E-4 (CPL)',
	6: 'E-5',
	7: 'E-6',
	8: 'E-7',
	9: 'E-8 (MSG)',
	10: 'E-8 (1SG)',
	11: 'E-9 (SGM)',
	12: 'E-9 (CSM)',
	13: 'W-1',
	14: 'W-2',
	15: 'W-3',
	16: 'W-4',
	17: 'W-5',
	18: 'O-1',
	19: 'O-2',
	20: 'O-3',
	21: 'O-4',
	22: 'O-5',
	23: 'O-6'
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: ranks } = await supabase
		.from('ranks')
		.select('id, name, abbreviation, sort_order, insignia_url')
		.order('sort_order', { ascending: true })

	const ranksWithGrade = (ranks ?? []).map((r) => ({
		...r,
		payGrade: PAY_GRADE_MAP[r.sort_order] ?? `?-${r.sort_order}`
	}))

	return { ranks: ranksWithGrade }
}
