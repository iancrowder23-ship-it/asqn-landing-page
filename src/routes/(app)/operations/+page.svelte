<script lang="ts">
  import type { PageData } from './$types'
  import { formatDate } from '$lib/utils/date'

  let { data }: { data: PageData } = $props()

  function typeBadgeClass(type: string): string {
    switch (type) {
      case 'operation':
        return 'bg-alert/20 text-alert border border-alert/40'
      case 'training':
        return 'bg-od-green/20 text-od-green border border-od-green/40'
      case 'ftx':
        return 'bg-ranger-tan/20 text-ranger-tan border border-ranger-tan/40'
      default:
        return 'bg-night-border text-steel border border-night-border'
    }
  }

  function statusBadgeClass(status: string): string {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
      case 'completed':
        return 'bg-od-green/20 text-od-green border border-od-green/40'
      case 'cancelled':
        return 'bg-night-border text-steel border border-night-border'
      default:
        return 'bg-night-border text-steel border border-night-border'
    }
  }
</script>

<svelte:head>
  <title>Operations — ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 py-8">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-tactical font-bold text-ranger-tan tracking-wider">
      Operations
    </h1>
    <a
      href="/operations/new"
      class="px-4 py-2 bg-od-green/20 text-od-green border border-od-green/40 rounded text-sm font-medium hover:bg-od-green/30 transition-colors uppercase tracking-wide"
    >
      + Create Operation
    </a>
  </div>

  {#if data.operations.length === 0}
    <div class="text-center py-16 text-steel/60">
      <p class="text-lg">No operations recorded yet.</p>
      <p class="text-sm mt-1">Create an operation to begin recording attendance.</p>
    </div>
  {:else}
    <div class="bg-night-surface border border-night-border rounded overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-night-border text-steel/70 text-left">
            <th class="px-4 py-3 font-medium">Title</th>
            <th class="px-4 py-3 font-medium">Type</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Date</th>
            <th class="px-4 py-3 font-medium">Description</th>
            <th class="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {#each data.operations as op}
            <tr class="border-b border-night-border/50 hover:bg-night/30 transition-colors">
              <td class="px-4 py-3 text-steel font-medium">{op.title}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-xs font-medium uppercase {typeBadgeClass(op.operation_type)}">
                  {op.operation_type}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-xs font-medium {statusBadgeClass(op.status)}">
                  {op.status}
                </span>
              </td>
              <td class="px-4 py-3 text-steel/80 whitespace-nowrap">{formatDate(op.operation_date)}</td>
              <td class="px-4 py-3 text-steel/60 max-w-xs truncate">
                {op.description ?? '—'}
              </td>
              <td class="px-4 py-3 text-right">
                <a
                  href="/operations/{op.id}"
                  class="text-ranger-tan hover:text-ranger-tan-muted text-xs uppercase tracking-wide transition-colors"
                >
                  Attendance
                </a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
