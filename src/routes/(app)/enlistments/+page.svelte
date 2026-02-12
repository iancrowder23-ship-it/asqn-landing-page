<script lang="ts">
  import type { PageData } from './$types'
  import { STATUS_LABELS } from '$lib/enlistment-transitions'

  let { data }: { data: PageData } = $props()

  type FilterType = 'all' | 'pending' | 'reviewing' | 'interview_scheduled'
  let activeFilter = $state<FilterType>('all')

  const filteredApplications = $derived(
    activeFilter === 'all'
      ? data.applications
      : data.applications.filter((a) => a.status === activeFilter)
  )

  function countByStatus(status: string): number {
    return data.allApplications.filter((a) => a.status === status).length
  }

  function countNonTerminal(): number {
    return data.allApplications.filter(
      (a) => a.status !== 'accepted' && a.status !== 'rejected'
    ).length
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function statusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50'
      case 'reviewing':
        return 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
      case 'interview_scheduled':
        return 'bg-green-900/40 text-green-300 border border-green-700/50'
      default:
        return 'bg-night-border text-steel border border-night-border'
    }
  }

  const tabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Active' },
    { key: 'pending', label: 'Pending' },
    { key: 'reviewing', label: 'Reviewing' },
    { key: 'interview_scheduled', label: 'Interview Scheduled' },
  ]

  function tabCount(key: FilterType): number {
    if (key === 'all') return countNonTerminal()
    return countByStatus(key)
  }
</script>

<div class="max-w-5xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-tactical font-bold text-ranger-tan tracking-wider mb-6">
    Enlistment Review Queue
  </h1>

  <!-- Status Filter Tabs -->
  <div class="flex gap-1 mb-6 border-b border-night-border">
    {#each tabs as tab}
      <button
        type="button"
        onclick={() => (activeFilter = tab.key)}
        class="px-4 py-2 text-sm font-medium transition-colors rounded-t
          {activeFilter === tab.key
            ? 'bg-night-surface text-ranger-tan border border-b-night-surface border-night-border border-b-0 -mb-px'
            : 'text-steel hover:text-ranger-tan'}"
      >
        {tab.label}
        <span
          class="ml-1.5 px-1.5 py-0.5 rounded text-xs
            {activeFilter === tab.key ? 'bg-ranger-tan/20 text-ranger-tan' : 'bg-night-border text-steel/70'}"
        >
          {tabCount(tab.key)}
        </span>
      </button>
    {/each}
  </div>

  <!-- Applications List -->
  {#if filteredApplications.length === 0}
    <div class="text-center py-16 text-steel/60">
      <p class="text-lg">No pending applications</p>
      <p class="text-sm mt-1">All enlistment applications in this status have been resolved.</p>
    </div>
  {:else}
    <div class="bg-night-surface border border-night-border rounded overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-night-border text-steel/70 text-left">
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Discord</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Submitted</th>
            <th class="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {#each filteredApplications as app}
            <tr class="border-b border-night-border/50 hover:bg-night/30 transition-colors">
              <td class="px-4 py-3 text-steel font-medium">{app.display_name}</td>
              <td class="px-4 py-3 text-steel/80">{app.discord_username ?? '—'}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-xs font-medium {statusBadgeClass(app.status)}">
                  {STATUS_LABELS[app.status] ?? app.status}
                </span>
              </td>
              <td class="px-4 py-3 text-steel/70">{formatDate(app.submitted_at)}</td>
              <td class="px-4 py-3 text-right">
                <a
                  href="/enlistments/{app.id}"
                  class="text-ranger-tan hover:text-ranger-tan-muted text-xs uppercase tracking-wide transition-colors"
                >
                  Review
                </a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
