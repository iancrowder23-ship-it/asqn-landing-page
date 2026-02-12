<script lang="ts">
  import type { PageData } from './$types'
  import { formatDate } from '$lib/utils/date'

  let { data }: { data: PageData } = $props()

  const typeBadges: Record<string, { label: string; classes: string }> = {
    operation: { label: 'OPERATION', classes: 'bg-alert/20 text-alert' },
    training: { label: 'TRAINING', classes: 'bg-od-green/20 text-od-green-light' },
    ftx: { label: 'FTX', classes: 'bg-ranger-tan/20 text-ranger-tan' },
  }

  function getTypeBadge(eventType: string) {
    return typeBadges[eventType] ?? { label: eventType.toUpperCase(), classes: 'bg-steel/20 text-steel' }
  }
</script>

<svelte:head>
  <title>Events -- ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-ranger-tan font-tactical mb-8">Upcoming Events</h1>

  {#if data.events.length === 0}
    <div class="dark:bg-night-surface dark:border-night-border border rounded-lg p-8 text-center">
      <p class="dark:text-steel text-lg">No upcoming events scheduled.</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each data.events as event}
        <div class="dark:bg-night-surface dark:border-night-border border rounded-lg p-4">
          <div class="flex items-start justify-between gap-4 mb-2">
            <h2 class="text-lg font-bold text-ranger-tan">{event.title}</h2>
            <span class="text-xs font-bold px-2 py-1 rounded uppercase shrink-0 {getTypeBadge(event.event_type).classes}">
              {getTypeBadge(event.event_type).label}
            </span>
          </div>
          <p class="dark:text-steel/70 text-sm mb-2">{formatDate(event.event_date)}</p>
          {#if event.description}
            <p class="dark:text-steel">{event.description}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
