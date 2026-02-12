<script lang="ts">
  import RosterTreeNode from './RosterTreeNode.svelte'

  interface Soldier {
    id: string
    display_name: string
    callsign: string | null
    rank_name: string | null
    rank_abbreviation: string | null
    rank_insignia_url: string | null
  }

  interface Unit {
    id: string
    name: string
    abbreviation: string | null
    parent_unit_id: string | null
  }

  interface TreeNode {
    unit: Unit
    soldiers: Soldier[]
    children: TreeNode[]
  }

  let { unit, soldiers, children }: {
    unit: Unit
    soldiers: Soldier[]
    children: TreeNode[]
  } = $props()
</script>

<div class="mb-4">
  <!-- Unit header -->
  <div class="bg-night-surface border border-night-border rounded px-3 py-2 mb-2">
    <span class="text-ranger-tan font-tactical font-bold">{unit.name}</span>
    {#if unit.abbreviation}
      <span class="text-steel/60 text-sm ml-2">({unit.abbreviation})</span>
    {/if}
  </div>

  <!-- Soldiers in this unit -->
  {#if soldiers.length > 0}
    <ul class="space-y-1 mb-2 pl-2">
      {#each soldiers as soldier}
        <li>
          <a
            href="/soldiers/{soldier.id}"
            class="flex items-center gap-2 text-sm text-steel hover:text-ranger-tan transition-colors py-1 px-2 rounded hover:bg-night-border/30"
          >
            <!-- Small rank insignia / abbreviation (24px) -->
            <div class="shrink-0 w-6 h-6 flex items-center justify-center">
              {#if soldier.rank_insignia_url}
                <img
                  src={soldier.rank_insignia_url}
                  alt={soldier.rank_abbreviation ?? ''}
                  class="w-6 h-6 object-contain"
                />
              {:else}
                <span class="text-ranger-tan font-tactical font-bold text-xs">
                  {soldier.rank_abbreviation ?? '—'}
                </span>
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
  {:else}
    <p class="text-steel/40 text-xs italic pl-2 mb-2">No soldiers assigned</p>
  {/if}

  <!-- Recursive child units -->
  {#if children.length > 0}
    <div class="ml-4 pl-4 border-l-2 border-night-border space-y-3">
      {#each children as child}
        <RosterTreeNode unit={child.unit} soldiers={child.soldiers} children={child.children} />
      {/each}
    </div>
  {/if}
</div>
