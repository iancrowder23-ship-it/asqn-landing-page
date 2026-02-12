<script lang="ts">
  import type { PageData } from './$types'
  import RosterCard from '$lib/components/RosterCard.svelte'
  import RosterTreeNode from '$lib/components/RosterTreeNode.svelte'

  let { data }: { data: PageData } = $props()

  // View toggle state
  type RosterView = 'grid' | 'tree' | 'table'
  let activeView: RosterView = $state('grid')

  // Filter state (for table view)
  let filterText: string = $state('')

  // Sort state (for table view)
  type SortKey = 'display_name' | 'rank_sort_order' | 'unit_name' | 'joined_at'
  let sortKey: SortKey = $state('rank_sort_order')
  let sortAsc: boolean = $state(false)

  // Derived: filtered soldiers for table view
  const filteredSoldiers = $derived(
    data.soldiers.filter(s =>
      !filterText ||
      s.display_name.toLowerCase().includes(filterText.toLowerCase()) ||
      (s.callsign?.toLowerCase().includes(filterText.toLowerCase()) ?? false) ||
      (s.rank_name?.toLowerCase().includes(filterText.toLowerCase()) ?? false) ||
      (s.unit_name?.toLowerCase().includes(filterText.toLowerCase()) ?? false)
    )
  )

  // Derived: sorted soldiers for table view
  const sortedSoldiers = $derived(
    [...filteredSoldiers].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortAsc ? cmp : -cmp
    })
  )

  // Tree builder function
  function buildNode(unit: typeof data.units[number], allUnits: typeof data.units, allSoldiers: typeof data.soldiers) {
    return {
      unit,
      soldiers: allSoldiers.filter(s => s.unit_id === unit.id),
      children: allUnits
        .filter(u => u.parent_unit_id === unit.id)
        .map(child => buildNode(child, allUnits, allSoldiers))
    }
  }

  function buildTree(units: typeof data.units, soldiers: typeof data.soldiers) {
    const rootUnits = units.filter(u => !u.parent_unit_id)
    return rootUnits.map(unit => buildNode(unit, units, soldiers))
  }

  const treeNodes = $derived(buildTree(data.units, data.soldiers))
  const unassignedSoldiers = $derived(data.soldiers.filter(s => s.unit_id === null))

  // Sort toggle for table
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortAsc = !sortAsc
    } else {
      sortKey = key
      sortAsc = false
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
</script>

<svelte:head>
  <title>Roster — ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-4 py-8">
  <!-- Page header -->
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-ranger-tan font-tactical tracking-wider">Roster</h1>
    <p class="text-steel/70 mt-1">Active members of ASQN 1st SFOD</p>
  </div>

  <!-- Controls row: view toggle + member count -->
  <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
    <!-- View toggle button group -->
    <div class="flex items-center rounded border border-night-border overflow-hidden">
      <button
        onclick={() => activeView = 'grid'}
        class="{activeView === 'grid' ? 'bg-od-green text-night' : 'text-steel hover:text-ranger-tan bg-night-surface'} px-4 py-2 text-sm font-tactical transition-colors border-r border-night-border"
      >
        Card Grid
      </button>
      <button
        onclick={() => activeView = 'tree'}
        class="{activeView === 'tree' ? 'bg-od-green text-night' : 'text-steel hover:text-ranger-tan bg-night-surface'} px-4 py-2 text-sm font-tactical transition-colors border-r border-night-border"
      >
        Unit Tree
      </button>
      <button
        onclick={() => activeView = 'table'}
        class="{activeView === 'table' ? 'bg-od-green text-night' : 'text-steel hover:text-ranger-tan bg-night-surface'} px-4 py-2 text-sm font-tactical transition-colors"
      >
        Table
      </button>
    </div>

    <!-- Member count -->
    <span class="text-steel/60 text-sm">
      {data.soldiers.length} active member{data.soldiers.length !== 1 ? 's' : ''}
    </span>
  </div>

  <!-- GRID VIEW -->
  {#if activeView === 'grid'}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {#each data.soldiers as soldier}
        <RosterCard {soldier} />
      {/each}
    </div>
    {#if data.soldiers.length === 0}
      <div class="bg-night-surface border border-night-border rounded p-8 text-center text-steel/50">
        No active members found.
      </div>
    {/if}

  <!-- TREE VIEW -->
  {:else if activeView === 'tree'}
    <div class="space-y-4">
      {#each treeNodes as node}
        <RosterTreeNode unit={node.unit} soldiers={node.soldiers} children={node.children} />
      {/each}

      <!-- Unassigned soldiers -->
      {#if unassignedSoldiers.length > 0}
        <div class="mb-4">
          <div class="bg-night-surface border border-night-border rounded px-3 py-2 mb-2">
            <span class="text-steel/60 font-tactical font-bold">Unassigned</span>
          </div>
          <ul class="space-y-1 pl-2">
            {#each unassignedSoldiers as soldier}
              <li>
                <a
                  href="/soldiers/{soldier.id}"
                  class="flex items-center gap-2 text-sm text-steel hover:text-ranger-tan transition-colors py-1 px-2 rounded hover:bg-night-border/30"
                >
                  <div class="shrink-0 w-6 h-6 flex items-center justify-center">
                    {#if soldier.rank_insignia_url}
                      <img src={soldier.rank_insignia_url} alt={soldier.rank_abbreviation ?? ''} class="w-6 h-6 object-contain" />
                    {:else}
                      <span class="text-ranger-tan font-tactical font-bold text-xs">{soldier.rank_abbreviation ?? '—'}</span>
                    {/if}
                  </div>
                  <span class="font-medium">{soldier.display_name}</span>
                  {#if soldier.callsign}
                    <span class="text-od-green-light text-xs">"{soldier.callsign}"</span>
                  {/if}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if treeNodes.length === 0 && unassignedSoldiers.length === 0}
        <div class="bg-night-surface border border-night-border rounded p-8 text-center text-steel/50">
          No units or active members found.
        </div>
      {/if}
    </div>

  <!-- TABLE VIEW -->
  {:else}
    <!-- Filter input -->
    <div class="mb-4">
      <input
        type="text"
        bind:value={filterText}
        placeholder="Search by name, callsign, rank, or unit..."
        class="w-full bg-night-surface border border-night-border rounded px-4 py-2 text-steel placeholder-steel/40 focus:outline-none focus:border-od-green transition-colors text-sm"
      />
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="bg-night-surface border-b border-night-border text-ranger-tan font-tactical text-xs uppercase tracking-wider">
            <th class="px-4 py-3">
              <button
                onclick={() => toggleSort('display_name')}
                class="flex items-center gap-1 hover:text-ranger-tan-muted transition-colors"
              >
                Name
                {#if sortKey === 'display_name'}
                  <span class="text-od-green-light">{sortAsc ? '▲' : '▼'}</span>
                {/if}
              </button>
            </th>
            <th class="px-4 py-3">
              <button
                onclick={() => toggleSort('rank_sort_order')}
                class="flex items-center gap-1 hover:text-ranger-tan-muted transition-colors"
              >
                Rank
                {#if sortKey === 'rank_sort_order'}
                  <span class="text-od-green-light">{sortAsc ? '▲' : '▼'}</span>
                {/if}
              </button>
            </th>
            <th class="px-4 py-3">Callsign</th>
            <th class="px-4 py-3">
              <button
                onclick={() => toggleSort('unit_name')}
                class="flex items-center gap-1 hover:text-ranger-tan-muted transition-colors"
              >
                Unit
                {#if sortKey === 'unit_name'}
                  <span class="text-od-green-light">{sortAsc ? '▲' : '▼'}</span>
                {/if}
              </button>
            </th>
            <th class="px-4 py-3">MOS</th>
            <th class="px-4 py-3">
              <button
                onclick={() => toggleSort('joined_at')}
                class="flex items-center gap-1 hover:text-ranger-tan-muted transition-colors"
              >
                Joined
                {#if sortKey === 'joined_at'}
                  <span class="text-od-green-light">{sortAsc ? '▲' : '▼'}</span>
                {/if}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each sortedSoldiers as soldier}
            <tr class="border-b border-night-border hover:bg-night-border/50 transition-colors cursor-pointer">
              <td class="px-4 py-3">
                <a href="/soldiers/{soldier.id}" class="text-steel hover:text-ranger-tan transition-colors font-medium">
                  {soldier.display_name}
                </a>
              </td>
              <td class="px-4 py-3 text-ranger-tan font-tactical">
                {soldier.rank_abbreviation ?? soldier.rank_name ?? '—'}
              </td>
              <td class="px-4 py-3 text-steel/80">
                {soldier.callsign ? `"${soldier.callsign}"` : '—'}
              </td>
              <td class="px-4 py-3 text-steel/80">
                {soldier.unit_abbreviation ?? soldier.unit_name ?? '—'}
              </td>
              <td class="px-4 py-3 text-steel/80 font-mono text-xs">
                {soldier.mos ?? '—'}
              </td>
              <td class="px-4 py-3 text-steel/60 text-xs">
                {formatDate(soldier.joined_at)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if sortedSoldiers.length === 0}
      <div class="bg-night-surface border border-night-border rounded p-8 text-center text-steel/50 mt-4">
        {filterText ? 'No members match your search.' : 'No active members found.'}
      </div>
    {:else}
      <p class="text-steel/40 text-xs mt-3">Showing {sortedSoldiers.length} of {data.soldiers.length} members</p>
    {/if}
  {/if}
</div>
