<script lang="ts">
  let { data } = $props()

  const typeBadges: Record<string, { label: string; classes: string }> = {
    operation: { label: 'OPERATION', classes: 'bg-alert/20 text-alert' },
    training: { label: 'TRAINING', classes: 'bg-od-green/20 text-od-green-light' },
    ftx: { label: 'FTX', classes: 'bg-ranger-tan/20 text-ranger-tan' },
  }

  function getBadge(eventType: string) {
    return typeBadges[eventType] ?? { label: eventType.toUpperCase(), classes: 'bg-steel/20 text-steel' }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso)
    const day = d.getUTCDate()
    const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()
    const year = d.getUTCFullYear()
    const hours = d.getUTCHours().toString().padStart(2, '0')
    const minutes = d.getUTCMinutes().toString().padStart(2, '0')
    return `${day} ${month} ${year} — ${hours}${minutes}Z`
  }
</script>

<svelte:head>
  <title>Events — ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-ranger-tan mb-8 font-tactical">Upcoming Events</h1>

  {#if data.events.length === 0}
    <div class="dark:bg-night-surface dark:border-night-border border rounded-lg p-8 text-center">
      <p class="text-steel text-lg mb-4">No upcoming events scheduled.</p>
      <p class="text-steel">
        Check back soon or <a href="/contact" class="text-od-green-light hover:text-ranger-tan transition-colors">join our Discord</a> for the latest updates.
      </p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each data.events as event}
        <div class="dark:bg-night-surface dark:border-night-border border rounded-lg p-4">
          <div class="flex items-start justify-between gap-4 mb-2">
            <h2 class="text-lg font-bold text-ranger-tan">{event.title}</h2>
            <span class="text-xs font-bold px-2 py-1 rounded uppercase shrink-0 {getBadge(event.event_type).classes}">
              {getBadge(event.event_type).label}
            </span>
          </div>
          <p class="text-ranger-tan/70 text-sm mb-2">{formatDate(event.event_date)}</p>
          {#if event.description}
            <p class="text-steel">{event.description}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
