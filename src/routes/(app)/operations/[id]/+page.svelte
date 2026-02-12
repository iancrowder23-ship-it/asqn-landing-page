<script lang="ts">
  import type { PageData } from './$types'
  import { enhance } from '$app/forms'
  import { formatDate } from '$lib/utils/date'

  let { data }: { data: PageData } = $props()

  const op = $derived(data.operation)

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

  function attendanceBadgeClass(status: string | undefined): string {
    if (!status) return 'bg-night-border/60 text-steel/50 border border-night-border/50'
    switch (status) {
      case 'present':
        return 'bg-od-green/20 text-od-green border border-od-green/40'
      case 'excused':
        return 'bg-ranger-tan/20 text-ranger-tan border border-ranger-tan/40'
      case 'absent':
        return 'bg-alert/20 text-alert border border-alert/40'
      default:
        return 'bg-night-border/60 text-steel/50 border border-night-border/50'
    }
  }

  function soldierStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-od-green/20 text-od-green border border-od-green/40'
      case 'loa':
        return 'bg-ranger-tan/20 text-ranger-tan border border-ranger-tan/40'
      case 'awol':
        return 'bg-alert/20 text-alert border border-alert/40'
      default:
        return 'bg-night-border text-steel border border-night-border'
    }
  }

  function getRankAbbr(soldier: typeof data.soldiers[0]): string {
    const ranks = soldier.ranks as unknown as { abbreviation: string } | { abbreviation: string }[] | null
    if (!ranks) return ''
    if (Array.isArray(ranks)) return ranks[0]?.abbreviation ?? ''
    return ranks.abbreviation ?? ''
  }
</script>

<svelte:head>
  <title>{op.title} — Operations — ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 py-8">
  <!-- Back link -->
  <div class="mb-6">
    <a href="/operations" class="text-steel/60 hover:text-steel text-sm transition-colors">
      &larr; Back to Operations
    </a>
  </div>

  <!-- Operation Header -->
  <div class="bg-night-surface border border-night-border rounded p-6 mb-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-tactical font-bold text-ranger-tan tracking-wider mb-2">
          {op.title}
        </h1>
        <div class="flex items-center gap-2 flex-wrap mb-3">
          <span class="px-2 py-0.5 rounded text-xs font-medium uppercase {typeBadgeClass(op.operation_type)}">
            {op.operation_type}
          </span>
          <span class="px-2 py-0.5 rounded text-xs font-medium {statusBadgeClass(op.status)}">
            {op.status}
          </span>
          <span class="text-steel/60 text-sm">{formatDate(op.operation_date)}</span>
        </div>
        {#if op.description}
          <p class="text-steel/80 text-sm leading-relaxed">{op.description}</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Attendance Roster -->
  <div>
    <div class="flex items-center gap-3 mb-4">
      <h2 class="text-lg font-tactical font-bold text-steel tracking-wide">
        Attendance Roster
      </h2>
      <span class="text-steel/50 text-sm">({data.soldiers.length} personnel)</span>
    </div>

    {#if data.soldiers.length === 0}
      <div class="text-center py-12 text-steel/60 bg-night-surface border border-night-border rounded">
        <p>No active personnel found.</p>
      </div>
    {:else}
      <!-- Column headers -->
      <div class="hidden md:grid grid-cols-[1fr_140px_120px_140px_150px_80px] gap-2 px-4 py-2 text-xs font-medium text-steel/50 uppercase tracking-wider border-b border-night-border mb-1">
        <span>Soldier</span>
        <span>Current</span>
        <span>Status</span>
        <span>Role Held</span>
        <span>Notes</span>
        <span></span>
      </div>

      <div class="space-y-1">
        {#each data.soldiers as soldier}
          {@const existing = data.existingAttendance[soldier.id]}
          <form
            method="POST"
            action="?/recordAttendance"
            use:enhance
            class="bg-night-surface border border-night-border rounded hover:border-night-border/80 transition-colors"
          >
            <input type="hidden" name="soldier_id" value={soldier.id} />

            <div class="flex flex-wrap md:grid md:grid-cols-[1fr_140px_120px_140px_150px_80px] gap-2 items-center px-4 py-3">
              <!-- Soldier info -->
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-steel/50 text-xs font-mono">{getRankAbbr(soldier)}</span>
                <a
                  href="/soldiers/{soldier.id}"
                  class="text-steel hover:text-ranger-tan transition-colors font-medium text-sm"
                >
                  {soldier.display_name}
                </a>
                {#if soldier.callsign}
                  <span class="text-steel/40 text-xs">"{soldier.callsign}"</span>
                {/if}
                <span class="px-1.5 py-0.5 rounded text-xs {soldierStatusBadgeClass(soldier.status)}">
                  {soldier.status}
                </span>
              </div>

              <!-- Current attendance status indicator -->
              <div>
                <span class="px-2 py-0.5 rounded text-xs font-medium {attendanceBadgeClass(existing?.status)}">
                  {existing?.status ?? 'not recorded'}
                </span>
              </div>

              <!-- Status select -->
              <div>
                <select
                  name="status"
                  class="bg-night border border-night-border rounded px-2 py-1 text-steel text-xs focus:outline-none focus:border-ranger-tan/50 w-full"
                >
                  {#each data.attendanceStatuses as attStatus}
                    <option value={attStatus} selected={existing?.status === attStatus}>
                      {attStatus.charAt(0).toUpperCase() + attStatus.slice(1)}
                    </option>
                  {/each}
                </select>
              </div>

              <!-- Role held input -->
              <div>
                <input
                  name="role_held"
                  type="text"
                  value={existing?.role_held ?? ''}
                  placeholder="e.g. Team Lead"
                  class="bg-night border border-night-border rounded px-2 py-1 text-steel text-xs focus:outline-none focus:border-ranger-tan/50 w-full placeholder:text-steel/30"
                />
              </div>

              <!-- Notes input -->
              <div>
                <input
                  name="notes"
                  type="text"
                  value={existing?.notes ?? ''}
                  placeholder="Optional notes"
                  class="bg-night border border-night-border rounded px-2 py-1 text-steel text-xs focus:outline-none focus:border-ranger-tan/50 w-full placeholder:text-steel/30"
                />
              </div>

              <!-- Submit button -->
              <div>
                <button
                  type="submit"
                  class="px-3 py-1 bg-od-green/20 text-od-green border border-od-green/40 rounded text-xs font-medium hover:bg-od-green/30 transition-colors uppercase tracking-wide w-full"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        {/each}
      </div>
    {/if}
  </div>
</div>
