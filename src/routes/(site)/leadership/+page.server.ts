import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Load all active soldiers with their rank and unit data.
	// Filter to leadership ranks (SFC and above = sort_order >= 8) in application code
	// because Supabase PostgREST .gte() on a referenced table filters the JOIN,
	// not the parent row — it would return all soldiers with ranks nulled out.
	const { data: allSoldiers } = await supabase
		.from('soldiers')
		.select(
			`
			display_name,
			callsign,
			mos,
			ranks ( name, abbreviation, sort_order ),
			units ( name, abbreviation )
		`
		)
		.eq('status', 'active')

	type SoldierRow = {
		display_name: string
		callsign: string | null
		mos: string | null
		ranks: { name: string; abbreviation: string; sort_order: number } | null
		units: { name: string; abbreviation: string | null } | null
	}

	const leaders = ((allSoldiers as SoldierRow[] | null) ?? [])
		.filter((s) => s.ranks && s.ranks.sort_order >= 8)
		.sort((a, b) => (b.ranks?.sort_order ?? 0) - (a.ranks?.sort_order ?? 0))

	return { leaders }
}
