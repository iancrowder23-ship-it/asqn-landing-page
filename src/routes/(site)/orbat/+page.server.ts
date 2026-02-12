import type { PageServerLoad } from './$types'

type Unit = {
	id: string
	name: string
	abbreviation: string | null
	parent_unit_id: string | null
}

type Soldier = {
	display_name: string
	callsign: string | null
	unit_id: string | null
	ranks: { name: string; abbreviation: string } | null
}

export interface TreeNode {
	unit: Unit
	soldiers: Soldier[]
	children: TreeNode[]
}

function buildTree(units: Unit[], soldiers: Soldier[], parentId: string | null = null): TreeNode[] {
	return units
		.filter((u) => u.parent_unit_id === parentId)
		.map((u) => ({
			unit: u,
			soldiers: soldiers.filter((s) => s.unit_id === u.id),
			children: buildTree(units, soldiers, u.id)
		}))
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [{ data: units }, { data: soldiers }] = await Promise.all([
		supabase.from('units').select('id, name, abbreviation, parent_unit_id'),
		supabase
			.from('soldiers')
			.select('display_name, callsign, unit_id, ranks(name, abbreviation)')
			.eq('status', 'active')
	])

	const tree = buildTree(units ?? [], (soldiers as Soldier[] | null) ?? [])
	return { tree }
}
