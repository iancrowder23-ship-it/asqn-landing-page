<script lang="ts">
  let { data } = $props()

  // Group ranks by category based on sort_order
  const enlisted = $derived(data.ranks.filter((r) => r.sort_order >= 1 && r.sort_order <= 12))
  const warrant = $derived(data.ranks.filter((r) => r.sort_order >= 13 && r.sort_order <= 17))
  const officer = $derived(data.ranks.filter((r) => r.sort_order >= 18 && r.sort_order <= 23))
</script>

<svelte:head>
  <title>Rank Chart — ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-ranger-tan mb-2 font-tactical">SF Rank Progression</h1>
  <p class="text-steel mb-8">All 23 Special Forces ranks from E-1 to O-6.</p>

  {#if data.ranks.length === 0}
    <div class="dark:bg-night-surface dark:border-night-border border rounded-lg p-8 text-center">
      <p class="text-steel">Rank data unavailable.</p>
    </div>
  {:else}
    <!-- Enlisted -->
    <section class="mb-8">
      <h2 class="text-2xl font-bold text-ranger-tan mb-4 font-tactical">Enlisted</h2>
      <div class="dark:bg-night-surface dark:border-night-border border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="dark:border-night-border border-b text-left text-sm text-steel uppercase tracking-wide">
              <th class="px-4 py-3 w-24">Pay Grade</th>
              <th class="px-4 py-3 w-24">Abbr</th>
              <th class="px-4 py-3">Full Name</th>
              <th class="px-4 py-3 w-32 text-center">Insignia</th>
            </tr>
          </thead>
          <tbody>
            {#each enlisted as rank}
              <tr class="dark:border-night-border border-b last:border-b-0 hover:dark:bg-night/50 transition-colors">
                <td class="px-4 py-3 text-sm text-steel font-mono">{rank.payGrade}</td>
                <td class="px-4 py-3 text-ranger-tan font-bold font-tactical">{rank.abbreviation}</td>
                <td class="px-4 py-3 text-steel">{rank.name}</td>
                <td class="px-4 py-3 text-center">
                  {#if rank.insignia_url}
                    <img src={rank.insignia_url} alt="{rank.name} insignia" class="h-8 w-8 mx-auto object-contain" />
                  {:else}
                    <span class="text-steel text-xs italic">[insignia pending]</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Warrant Officer -->
    <section class="mb-8">
      <h2 class="text-2xl font-bold text-ranger-tan mb-4 font-tactical">Warrant Officer</h2>
      <div class="dark:bg-night-surface dark:border-night-border border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="dark:border-night-border border-b text-left text-sm text-steel uppercase tracking-wide">
              <th class="px-4 py-3 w-24">Pay Grade</th>
              <th class="px-4 py-3 w-24">Abbr</th>
              <th class="px-4 py-3">Full Name</th>
              <th class="px-4 py-3 w-32 text-center">Insignia</th>
            </tr>
          </thead>
          <tbody>
            {#each warrant as rank}
              <tr class="dark:border-night-border border-b last:border-b-0 hover:dark:bg-night/50 transition-colors">
                <td class="px-4 py-3 text-sm text-steel font-mono">{rank.payGrade}</td>
                <td class="px-4 py-3 text-ranger-tan font-bold font-tactical">{rank.abbreviation}</td>
                <td class="px-4 py-3 text-steel">{rank.name}</td>
                <td class="px-4 py-3 text-center">
                  {#if rank.insignia_url}
                    <img src={rank.insignia_url} alt="{rank.name} insignia" class="h-8 w-8 mx-auto object-contain" />
                  {:else}
                    <span class="text-steel text-xs italic">[insignia pending]</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Officer -->
    <section class="mb-8">
      <h2 class="text-2xl font-bold text-ranger-tan mb-4 font-tactical">Officer</h2>
      <div class="dark:bg-night-surface dark:border-night-border border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="dark:border-night-border border-b text-left text-sm text-steel uppercase tracking-wide">
              <th class="px-4 py-3 w-24">Pay Grade</th>
              <th class="px-4 py-3 w-24">Abbr</th>
              <th class="px-4 py-3">Full Name</th>
              <th class="px-4 py-3 w-32 text-center">Insignia</th>
            </tr>
          </thead>
          <tbody>
            {#each officer as rank}
              <tr class="dark:border-night-border border-b last:border-b-0 hover:dark:bg-night/50 transition-colors">
                <td class="px-4 py-3 text-sm text-steel font-mono">{rank.payGrade}</td>
                <td class="px-4 py-3 text-ranger-tan font-bold font-tactical">{rank.abbreviation}</td>
                <td class="px-4 py-3 text-steel">{rank.name}</td>
                <td class="px-4 py-3 text-center">
                  {#if rank.insignia_url}
                    <img src={rank.insignia_url} alt="{rank.name} insignia" class="h-8 w-8 mx-auto object-contain" />
                  {:else}
                    <span class="text-steel text-xs italic">[insignia pending]</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>
