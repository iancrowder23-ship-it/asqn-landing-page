import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: rawSoldiers } = await supabase
		.from('soldiers')
		.select(`
			display_name,
			callsign,
			mos,
			ranks ( name, abbreviation, sort_order ),
			units ( name, abbreviation )
		`)
		.eq('status', 'active')
		.order('sort_order', { referencedTable: 'ranks', ascending: false })

	// Normalize joined FK data: Supabase types FK joins as arrays,
	// but single-FK relations return a single object at runtime.
	// We flatten here so the template gets clean scalar types.
	const soldiers = (rawSoldiers ?? []).map((s) => {
		const rank = Array.isArray(s.ranks) ? s.ranks[0] : s.ranks
		const unit = Array.isArray(s.units) ? s.units[0] : s.units
		return {
			display_name: s.display_name,
			callsign: s.callsign,
			mos: s.mos,
			rank_abbreviation: rank?.abbreviation ?? null,
			rank_name: rank?.name ?? null,
			unit_abbreviation: unit?.abbreviation ?? null,
			unit_name: unit?.name ?? null,
		}
	})

	return { soldiers }
}
