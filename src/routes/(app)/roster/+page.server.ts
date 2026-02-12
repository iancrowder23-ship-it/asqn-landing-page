import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Fetch all active soldiers with rank + unit for all three views
	const { data: rawSoldiers } = await supabase
		.from('soldiers')
		.select(`
      id, display_name, callsign, mos, status, unit_id, joined_at,
      ranks ( id, name, abbreviation, sort_order, insignia_url ),
      units ( id, name, abbreviation, parent_unit_id )
    `)
		.eq('status', 'active')
		.order('sort_order', { referencedTable: 'ranks', ascending: false })

	// Normalize FK joins (established codebase pattern)
	const soldiers = (rawSoldiers ?? []).map((s) => {
		const rank = Array.isArray(s.ranks) ? s.ranks[0] : s.ranks
		const unit = Array.isArray(s.units) ? s.units[0] : s.units
		return {
			id: s.id,
			display_name: s.display_name,
			callsign: s.callsign,
			mos: s.mos,
			status: s.status,
			unit_id: s.unit_id,
			joined_at: s.joined_at,
			rank_sort_order: rank?.sort_order ?? 0,
			rank_name: rank?.name ?? null,
			rank_abbreviation: rank?.abbreviation ?? null,
			rank_insignia_url: rank?.insignia_url ?? null,
			unit_name: unit?.name ?? null,
			unit_abbreviation: unit?.abbreviation ?? null,
			unit_parent_id: unit?.parent_unit_id ?? null,
		}
	})

	// Fetch all units for tree view
	const { data: units } = await supabase
		.from('units')
		.select('id, name, abbreviation, parent_unit_id')

	return { soldiers, units: units ?? [] }
}
