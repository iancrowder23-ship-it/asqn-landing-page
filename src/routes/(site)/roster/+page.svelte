<script lang="ts">
  let { data } = $props()
</script>

<svelte:head>
  <title>Roster — ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-ranger-tan mb-2 font-tactical">Unit Roster</h1>
  <p class="text-steel mb-6">Active Members — Squadron A</p>
  <p class="text-steel/70 text-sm mb-4">Showing {data.soldiers.length} active member{data.soldiers.length !== 1 ? 's' : ''}</p>

  {#if data.soldiers.length === 0}
    <div class="dark:bg-night-surface dark:border-night-border border rounded-lg p-8 text-center">
      <p class="text-steel text-lg">No active members to display.</p>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead>
          <tr class="dark:bg-night-surface dark:border-night-border border-b text-ranger-tan font-tactical text-sm uppercase tracking-wider">
            <th class="px-4 py-3">Rank <span class="text-od-green-light text-xs normal-case">&#9660;</span></th>
            <th class="px-4 py-3">Name</th>
            <th class="px-4 py-3">Callsign</th>
            <th class="px-4 py-3">MOS</th>
            <th class="px-4 py-3">Unit</th>
          </tr>
        </thead>
        <tbody>
          {#each data.soldiers as soldier}
            <tr class="dark:border-night-border border-b dark:hover:bg-night-surface/50 odd:dark:bg-night-surface/30 transition-colors">
              <td class="px-4 py-3 text-ranger-tan font-bold">{soldier.rank_abbreviation ?? '—'}</td>
              <td class="px-4 py-3 text-steel">{soldier.display_name}</td>
              <td class="px-4 py-3 text-steel">{soldier.callsign ?? '—'}</td>
              <td class="px-4 py-3 text-steel">{soldier.mos ?? '—'}</td>
              <td class="px-4 py-3 text-steel">{soldier.unit_abbreviation ?? soldier.unit_name ?? '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
