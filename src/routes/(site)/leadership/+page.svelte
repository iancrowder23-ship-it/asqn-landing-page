<script lang="ts">
  let { data } = $props()
</script>

<svelte:head>
  <title>Leadership — ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-ranger-tan mb-2 font-tactical">Command Structure</h1>
  <p class="text-steel mb-8">Unit leadership from senior NCOs through commissioned officers.</p>

  {#if data.leaders.length === 0}
    <div class="dark:bg-night-surface dark:border-night-border border rounded-lg p-8 text-center">
      <p class="text-steel">Leadership roster not yet populated. Check back soon.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each data.leaders as leader}
        <div class="dark:bg-night-surface dark:border-night-border border rounded-lg p-4">
          <div class="flex items-start gap-3">
            <div class="flex-1">
              <div class="mb-1">
                {#if leader.ranks}
                  <span class="text-ranger-tan font-tactical font-bold">{leader.ranks.abbreviation}</span>
                {/if}
                <span class="text-steel font-bold ml-1">{leader.display_name}</span>
              </div>

              {#if leader.callsign}
                <p class="text-od-green-light text-sm mb-1">"{leader.callsign}"</p>
              {/if}

              {#if leader.mos}
                <p class="text-steel text-sm">MOS: <span class="text-ranger-tan-muted">{leader.mos}</span></p>
              {/if}

              {#if leader.units}
                <p class="text-steel text-sm">
                  Unit: <span class="text-ranger-tan-muted">{leader.units.name}{#if leader.units.abbreviation} ({leader.units.abbreviation}){/if}</span>
                </p>
              {/if}

              {#if leader.ranks}
                <p class="text-steel text-xs mt-2 opacity-60">{leader.ranks.name}</p>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
