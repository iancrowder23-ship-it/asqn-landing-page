<script lang="ts">
  import OrbatNode from '$lib/components/OrbatNode.svelte'

  let { data } = $props()
</script>

<svelte:head>
  <title>ORBAT — ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-ranger-tan mb-2 font-tactical">Order of Battle</h1>
  <p class="text-steel mb-8">Squadron A — Troop Structure</p>

  {#if data.tree.length === 0}
    <div class="dark:bg-night-surface dark:border-night-border border rounded-lg p-8 text-center">
      <p class="text-steel">ORBAT data not yet available.</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each data.tree as node}
        <OrbatNode unit={node.unit} soldiers={node.soldiers} children={node.children} />
      {/each}
    </div>
  {/if}
</div>
