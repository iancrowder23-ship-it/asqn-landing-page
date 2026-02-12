<script lang="ts">
  import type { PageData } from './$types'
  import { formatDate } from '$lib/utils/date'

  let { data }: { data: PageData } = $props()

  // Unit readiness percentages for Command+ only
  const totalSoldiers = $derived(
    data.metrics
      ? (data.metrics.activeCount + data.metrics.loaCount + data.metrics.awolCount)
      : 0
  )
  const activePercent = $derived(
    totalSoldiers > 0 ? Math.round((data.metrics!.activeCount / totalSoldiers) * 100) : 0
  )
  const loaPercent = $derived(
    totalSoldiers > 0 ? Math.round((data.metrics!.loaCount / totalSoldiers) * 100) : 0
  )
  const awolPercent = $derived(
    totalSoldiers > 0 ? Math.round((data.metrics!.awolCount / totalSoldiers) * 100) : 0
  )

  function actionLabel(actionType: string): { text: string; class: string } {
    const labels: Record<string, { text: string; class: string }> = {
      rank_change:    { text: 'PROMOTION',  class: 'bg-ranger-tan text-night-bg' },
      transfer:       { text: 'TRANSFER',   class: 'bg-blue-600 text-white' },
      status_change:  { text: 'STATUS',     class: 'bg-alert text-white' },
      qualification:  { text: 'QUAL',       class: 'bg-od-green text-white' },
      award:          { text: 'AWARD',      class: 'bg-ranger-tan text-night-bg' },
      enlistment:     { text: 'ENLISTMENT', class: 'bg-blue-600 text-white' },
      note:           { text: 'NOTE',       class: 'bg-steel/30 text-steel' },
    }
    return labels[actionType] ?? { text: actionType.toUpperCase(), class: 'bg-steel/30 text-steel' }
  }

  function actionDescription(actionType: string, payload: Record<string, unknown>): string {
    switch (actionType) {
      case 'rank_change':
        return `${payload.from_rank_name ?? '?'} \u2192 ${payload.to_rank_name ?? '?'}`
      case 'transfer':
        return `to ${payload.to_unit_name ?? '?'}`
      case 'status_change':
        return `${payload.from_status ?? '?'} \u2192 ${payload.to_status ?? '?'}`
      case 'qualification':
        return `${payload.qualification_name ?? payload.qualification_id ?? ''}`
      case 'award':
        return `${payload.award_name ?? payload.award_id ?? ''}`
      case 'enlistment':
        return `enlisted`
      case 'note':
        return String(payload.text ?? '').slice(0, 60)
      default:
        return ''
    }
  }

  function attendanceColor(pct: number): string {
    if (pct >= 80) return 'text-od-green'
    if (pct >= 50) return 'text-ranger-tan'
    return 'text-alert'
  }

  function eventTypeBadge(eventType: string): string {
    const types: Record<string, string> = {
      operation: 'bg-od-green/20 text-od-green',
      training:  'bg-blue-600/20 text-blue-400',
      meeting:   'bg-steel/20 text-steel',
      ftx:       'bg-ranger-tan/20 text-ranger-tan',
    }
    return types[eventType] ?? 'bg-steel/20 text-steel'
  }
</script>

<div class="max-w-6xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold text-ranger-tan mb-6 font-tactical">Dashboard</h1>

  {#if data.metrics}
    <!-- ===== COMMAND+ ADMIN DASHBOARD ===== -->

    <!-- Key Metrics row: 4 stat cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-night-surface border border-night-border rounded-lg p-4 text-center">
        <div class="text-3xl font-bold text-od-green">{data.metrics.activeCount}</div>
        <div class="text-xs text-steel mt-1 uppercase tracking-wide">Active Members</div>
      </div>
      <div class="bg-night-surface border border-night-border rounded-lg p-4 text-center">
        <div class="text-3xl font-bold text-ranger-tan">{data.metrics.loaCount}</div>
        <div class="text-xs text-steel mt-1 uppercase tracking-wide">On LOA</div>
      </div>
      <div class="bg-night-surface border border-night-border rounded-lg p-4 text-center">
        <div class="text-3xl font-bold text-alert">{data.metrics.awolCount}</div>
        <div class="text-xs text-steel mt-1 uppercase tracking-wide">AWOL</div>
      </div>
      <a
        href="/enlistments"
        class="bg-night-surface border border-night-border rounded-lg p-4 text-center hover:border-steel/50 transition-colors"
      >
        <div class="text-3xl font-bold text-blue-400">{data.metrics.pendingAppsCount}</div>
        <div class="text-xs text-steel mt-1 uppercase tracking-wide">Pending Applications</div>
      </a>
    </div>

    <!-- Unit Readiness Bar -->
    <div class="bg-night-surface border border-night-border rounded-lg p-4 mb-6">
      <h2 class="text-sm font-semibold text-ranger-tan uppercase tracking-wide mb-3">Unit Readiness</h2>
      {#if totalSoldiers > 0}
        <div class="flex h-6 rounded overflow-hidden mb-3">
          <div class="bg-od-green transition-all" style="width: {activePercent}%"></div>
          <div class="bg-ranger-tan transition-all" style="width: {loaPercent}%"></div>
          <div class="bg-alert transition-all" style="width: {awolPercent}%"></div>
        </div>
        <div class="flex gap-4 text-sm flex-wrap">
          <span class="flex items-center gap-1.5">
            <span class="inline-block w-3 h-3 rounded-sm bg-od-green"></span>
            <span class="text-steel">Active: <span class="text-white">{data.metrics.activeCount}</span> ({activePercent}%)</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block w-3 h-3 rounded-sm bg-ranger-tan"></span>
            <span class="text-steel">LOA: <span class="text-white">{data.metrics.loaCount}</span> ({loaPercent}%)</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="inline-block w-3 h-3 rounded-sm bg-alert"></span>
            <span class="text-steel">AWOL: <span class="text-white">{data.metrics.awolCount}</span> ({awolPercent}%)</span>
          </span>
        </div>
      {:else}
        <p class="text-steel text-sm">No soldier records yet.</p>
      {/if}
    </div>

    <!-- Two-column section: Attendance Trends | Recent Personnel Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

      <!-- Attendance Trends Table -->
      <div class="bg-night-surface border border-night-border rounded-lg p-4">
        <h2 class="text-sm font-semibold text-ranger-tan uppercase tracking-wide mb-3">Attendance Trends</h2>
        {#if data.attendanceTrends && data.attendanceTrends.length > 0}
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-xs text-steel/70 uppercase tracking-wide border-b border-night-border">
                  <th class="text-left pb-2 pr-2">Operation</th>
                  <th class="text-center pb-2 px-1">Pres</th>
                  <th class="text-center pb-2 px-1">Exc</th>
                  <th class="text-center pb-2 px-1">Abs</th>
                  <th class="text-right pb-2 pl-2">Att%</th>
                </tr>
              </thead>
              <tbody>
                {#each data.attendanceTrends as trend}
                  <tr class="border-b border-night-border/50 hover:bg-night-border/20">
                    <td class="py-2 pr-2">
                      <div class="text-white text-xs leading-tight truncate max-w-[160px]" title={trend.operation.title}>
                        {trend.operation.title}
                      </div>
                      <div class="text-steel/60 text-xs">
                        {trend.operation.operation_date
                          ? formatDate(trend.operation.operation_date)
                          : '—'}
                      </div>
                    </td>
                    <td class="py-2 px-1 text-center text-od-green">{trend.present}</td>
                    <td class="py-2 px-1 text-center text-ranger-tan">{trend.excused}</td>
                    <td class="py-2 px-1 text-center text-alert">{trend.absent}</td>
                    <td class="py-2 pl-2 text-right font-mono font-semibold {attendanceColor(trend.percentage)}">
                      {trend.percentage}%
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="text-steel text-sm">No completed operations with attendance data.</p>
        {/if}
      </div>

      <!-- Recent Personnel Actions Feed -->
      <div class="bg-night-surface border border-night-border rounded-lg p-4">
        <h2 class="text-sm font-semibold text-ranger-tan uppercase tracking-wide mb-3">Recent Personnel Actions</h2>
        {#if data.recentActions && data.recentActions.length > 0}
          <ul class="space-y-2">
            {#each data.recentActions as action}
              {@const label = actionLabel(action.action_type)}
              {@const desc = actionDescription(action.action_type, action.payload ?? {})}
              <li class="flex items-start gap-2 border-b border-night-border/50 pb-2 last:border-0 last:pb-0">
                <span class="mt-0.5 shrink-0 text-xs font-bold px-1.5 py-0.5 rounded {label.class}">
                  {label.text}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline gap-1 flex-wrap">
                    {#if action.soldier_id}
                      <a
                        href="/soldiers/{action.soldier_id}"
                        class="text-sm text-white hover:text-ranger-tan font-medium truncate"
                      >{action.soldier_name}</a>
                    {:else}
                      <span class="text-sm text-steel">{action.soldier_name}</span>
                    {/if}
                    {#if desc}
                      <span class="text-xs text-steel truncate">{desc}</span>
                    {/if}
                  </div>
                  <div class="text-xs text-steel/60 mt-0.5">
                    {action.occurred_at ? formatDate(action.occurred_at) : '—'}
                  </div>
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="text-steel text-sm">No recent personnel actions.</p>
        {/if}
      </div>
    </div>
  {:else}
    <!-- ===== NON-COMMAND WELCOME ===== -->
    <p class="text-steel mb-6">Welcome. You are authenticated.</p>
  {/if}

  <!-- ===== UPCOMING EVENTS (All authenticated users) ===== -->
  <div class="bg-night-surface border border-night-border rounded-lg p-4">
    <h2 class="text-sm font-semibold text-ranger-tan uppercase tracking-wide mb-3">Upcoming Events</h2>
    {#if data.upcomingEvents && data.upcomingEvents.length > 0}
      <ul class="space-y-2">
        {#each data.upcomingEvents as event}
          <li class="flex items-center gap-3 border-b border-night-border/50 pb-2 last:border-0 last:pb-0">
            <span class="shrink-0 text-xs font-medium px-2 py-0.5 rounded uppercase {eventTypeBadge(event.event_type ?? '')}">
              {event.event_type ?? 'event'}
            </span>
            <div class="flex-1 min-w-0">
              <a href="/events" class="text-sm text-white hover:text-ranger-tan font-medium truncate block">
                {event.title}
              </a>
              <div class="text-xs text-steel/70">
                {event.event_date ? formatDate(event.event_date) : '—'}
              </div>
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-steel text-sm">No upcoming events.</p>
    {/if}
  </div>
</div>
