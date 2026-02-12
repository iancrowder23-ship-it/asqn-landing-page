<script lang="ts">
  import type { PageData } from './$types'
  import { formatDate } from '$lib/utils/date'
  import { hasRole } from '$lib/auth/roles'

  let { data }: { data: PageData } = $props()

  const typeBadges: Record<string, { label: string; classes: string }> = {
    operation: { label: 'OPERATION', classes: 'bg-alert/20 text-alert' },
    training: { label: 'TRAINING', classes: 'bg-od-green/20 text-od-green-light' },
    ftx: { label: 'FTX', classes: 'bg-ranger-tan/20 text-ranger-tan' },
  }

  function getTypeBadge(eventType: string) {
    return typeBadges[eventType] ?? { label: eventType.toUpperCase(), classes: 'bg-steel/20 text-steel' }
  }

  const statusBadges: Record<string, { label: string; classes: string }> = {
    scheduled: { label: 'SCHEDULED', classes: 'bg-blue-500/20 text-blue-400' },
    completed: { label: 'COMPLETED', classes: 'bg-od-green/20 text-od-green-light' },
    cancelled: { label: 'CANCELLED', classes: 'bg-steel/20 text-steel/50' },
  }

  function getStatusBadge(status: string) {
    return statusBadges[status] ?? { label: status.toUpperCase(), classes: 'bg-steel/20 text-steel' }
  }
</script>

<svelte:head>
  <title>Events -- ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
  <div class="flex items-center justify-between mb-8">
    <h1 class="text-3xl font-bold text-ranger-tan font-tactical">Events</h1>
    {#if hasRole(data.userRole, 'nco')}
      <a
        href="/events/new"
        class="bg-od-green text-night font-bold px-4 py-2 rounded hover:bg-od-green-light transition-colors"
      >
        Create Event
      </a>
    {/if}
  </div>

  {#if data.events.length === 0}
    <div class="dark:bg-night-surface dark:border-night-border border rounded-lg p-8 text-center">
      <p class="text-steel text-lg">No events found.</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each data.events as event}
        <div class="dark:bg-night-surface dark:border-night-border border rounded-lg p-4">
          <div class="flex items-start justify-between gap-4 mb-2">
            <h2 class="text-lg font-bold {event.status === 'cancelled' ? 'text-steel/50 line-through' : 'text-ranger-tan'}">
              {event.title}
            </h2>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-xs font-bold px-2 py-1 rounded uppercase {getTypeBadge(event.event_type).classes}">
                {getTypeBadge(event.event_type).label}
              </span>
              <span class="text-xs font-bold px-2 py-1 rounded uppercase {getStatusBadge(event.status).classes}">
                {getStatusBadge(event.status).label}
              </span>
            </div>
          </div>
          <p class="text-ranger-tan/70 text-sm mb-2">{formatDate(event.event_date)}</p>
          {#if event.description}
            <p class="text-steel">{event.description}</p>
          {/if}
          {#if hasRole(data.userRole, 'nco')}
            <div class="mt-3 pt-3 border-t border-night-border/50">
              <a
                href="/events/{event.id}/edit"
                class="text-ranger-tan hover:text-ranger-tan/70 text-xs uppercase tracking-wide transition-colors"
              >
                Edit
              </a>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
