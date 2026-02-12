<script lang="ts">
  import OrbatNode from './OrbatNode.svelte'

  let { unit, soldiers, children }: {
    unit: { id: string; name: string; abbreviation: string | null }
    soldiers: { display_name: string; callsign: string | null; ranks: { name: string; abbreviation: string } | null }[]
    children: { unit: { id: string; name: string; abbreviation: string | null }; soldiers: { display_name: string; callsign: string | null; ranks: { name: string; abbreviation: string } | null }[]; children: any[] }[]
  } = $props()
</script>

<div class="dark:bg-night-surface dark:border-od-green border rounded p-3">
  <div class="mb-2">
    <span class="text-ranger-tan font-bold font-tactical text-lg">{unit.name}</span>
    {#if unit.abbreviation}
      <span class="text-steel text-sm ml-2">({unit.abbreviation})</span>
    {/if}
  </div>

  {#if soldiers.length > 0}
    <ul class="space-y-1 mb-3">
      {#each soldiers as soldier}
        <li class="text-sm text-steel flex items-center gap-2">
          {#if soldier.ranks}
            <span class="text-ranger-tan font-tactical font-bold">{soldier.ranks.abbreviation}</span>
          {/if}
          <span>{soldier.display_name}</span>
          {#if soldier.callsign}
            <span class="text-od-green-light text-xs">"{soldier.callsign}"</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  {#if children.length > 0}
    <div class="ml-4 mt-3 space-y-3 border-l-2 dark:border-night-border pl-4">
      {#each children as child}
        <OrbatNode unit={child.unit} soldiers={child.soldiers} children={child.children} />
      {/each}
    </div>
  {/if}
</div>
