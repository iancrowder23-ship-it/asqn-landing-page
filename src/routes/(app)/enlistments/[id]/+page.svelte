<script lang="ts">
  import type { PageData } from './$types'
  import { enhance } from '$app/forms'
  import { superForm } from 'sveltekit-superforms'
  import { STATUS_LABELS, NEXT_STATES } from '$lib/enlistment-transitions'
  import { hasRole } from '$lib/auth/roles'

  let { data }: { data: PageData } = $props()

  const { form: advanceFormData, enhance: advanceEnhance, message: advanceMessage } = superForm(
    data.advanceForm,
    { dataType: 'form' }
  )

  const { form: acceptFormData, enhance: acceptEnhance, message: acceptMessage } = superForm(
    data.acceptForm,
    { dataType: 'form' }
  )

  const app = $derived(data.application)
  const isCommand = $derived(hasRole(data.userRole, 'command'))
  const isTerminal = $derived(app.status === 'accepted' || app.status === 'rejected')
  const nextStates = $derived(NEXT_STATES[app.status] ?? [])
  const hasAcceptTransition = $derived(nextStates.some((s) => s.value === 'accepted'))
  const nonAcceptTransitions = $derived(nextStates.filter((s) => s.value !== 'accepted'))

  function statusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50'
      case 'reviewing':
        return 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
      case 'interview_scheduled':
        return 'bg-green-900/40 text-green-300 border border-green-700/50'
      case 'accepted':
        return 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
      case 'rejected':
        return 'bg-red-900/40 text-red-300 border border-red-700/50'
      default:
        return 'bg-night-border text-steel border border-night-border'
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function buttonClass(style: string): string {
    switch (style) {
      case 'primary':
        return 'px-4 py-2 bg-ranger-tan text-night font-medium text-sm rounded hover:bg-ranger-tan-muted transition-colors'
      case 'danger':
        return 'px-4 py-2 bg-red-800 text-red-100 font-medium text-sm rounded hover:bg-red-700 transition-colors'
      default:
        return 'px-4 py-2 bg-night-border text-steel font-medium text-sm rounded hover:bg-night-border/80 transition-colors'
    }
  }
</script>

<div class="max-w-3xl mx-auto px-4 py-8">
  <!-- Back link -->
  <a href="/enlistments" class="text-steel/60 hover:text-steel text-sm transition-colors mb-6 inline-block">
    &larr; Back to Queue
  </a>

  <!-- Header -->
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-2xl font-tactical font-bold text-ranger-tan tracking-wider">
        {app.display_name}
      </h1>
      {#if app.discord_username}
        <p class="text-steel/70 text-sm mt-0.5">{app.discord_username} on Discord</p>
      {/if}
    </div>
    <span class="px-3 py-1 rounded text-sm font-medium {statusBadgeClass(app.status)}">
      {STATUS_LABELS[app.status] ?? app.status}
    </span>
  </div>

  <!-- Application Details Card -->
  <div class="bg-night-surface border border-night-border rounded p-6 mb-6 space-y-4">
    <h2 class="text-sm font-medium text-ranger-tan/80 uppercase tracking-wider border-b border-night-border pb-2">
      Application Details
    </h2>

    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span class="text-steel/60 block text-xs uppercase tracking-wide mb-0.5">Age</span>
        <span class="text-steel">{app.age ?? '—'}</span>
      </div>
      <div>
        <span class="text-steel/60 block text-xs uppercase tracking-wide mb-0.5">Timezone</span>
        <span class="text-steel">{app.timezone ?? '—'}</span>
      </div>
      <div>
        <span class="text-steel/60 block text-xs uppercase tracking-wide mb-0.5">Submitted</span>
        <span class="text-steel">{formatDate(app.submitted_at)}</span>
      </div>
      {#if app.referred_by}
        <div>
          <span class="text-steel/60 block text-xs uppercase tracking-wide mb-0.5">Referred By</span>
          <span class="text-steel">{app.referred_by}</span>
        </div>
      {/if}
    </div>

    <div>
      <span class="text-steel/60 block text-xs uppercase tracking-wide mb-1">Arma Experience</span>
      <p class="text-steel text-sm whitespace-pre-wrap">{app.arma_experience ?? '—'}</p>
    </div>

    <div>
      <span class="text-steel/60 block text-xs uppercase tracking-wide mb-1">Why Join</span>
      <p class="text-steel text-sm whitespace-pre-wrap">{app.why_join ?? '—'}</p>
    </div>

    {#if app.notes}
      <div>
        <span class="text-steel/60 block text-xs uppercase tracking-wide mb-1">Notes</span>
        <p class="text-steel text-sm whitespace-pre-wrap">{app.notes}</p>
      </div>
    {/if}
  </div>

  <!-- Terminal Status Display -->
  {#if isTerminal}
    <div class="bg-night-surface border border-night-border rounded p-6 mb-6">
      <h2 class="text-sm font-medium text-ranger-tan/80 uppercase tracking-wider mb-3">
        Final Decision
      </h2>
      <div class="flex items-center gap-3">
        <span class="px-3 py-1 rounded text-sm font-medium {statusBadgeClass(app.status)}">
          {STATUS_LABELS[app.status] ?? app.status}
        </span>
        {#if app.reviewed_at}
          <span class="text-steel/60 text-sm">{formatDate(app.reviewed_at)}</span>
        {/if}
      </div>
      {#if app.status === 'accepted' && app.soldier_id}
        <div class="mt-3">
          <a
            href="/soldiers/{app.soldier_id}"
            class="text-ranger-tan hover:text-ranger-tan-muted text-sm transition-colors"
          >
            View Soldier Profile &rarr;
          </a>
        </div>
      {/if}
    </div>

  <!-- Action Buttons for Command+ (non-terminal) -->
  {:else if isCommand}
    <div class="bg-night-surface border border-night-border rounded p-6 mb-6">
      <h2 class="text-sm font-medium text-ranger-tan/80 uppercase tracking-wider mb-4">
        Actions
      </h2>

      <!-- Error/Success messages -->
      {#if $advanceMessage}
        <div class="mb-4 px-3 py-2 rounded text-sm
          {$advanceMessage.startsWith('Cannot') || $advanceMessage.startsWith('Failed')
            ? 'bg-red-900/30 text-red-300 border border-red-700/30'
            : 'bg-green-900/30 text-green-300 border border-green-700/30'}">
          {$advanceMessage}
        </div>
      {/if}

      <!-- Non-accept transitions -->
      {#if nonAcceptTransitions.length > 0}
        <div class="flex gap-3 flex-wrap mb-4">
          {#each nonAcceptTransitions as transition}
            {#if transition.value !== 'rejected'}
              <form method="POST" action="?/advance" use:advanceEnhance>
                <input type="hidden" name="target_status" value={transition.value} />
                <button type="submit" class={buttonClass(transition.style)}>
                  {transition.label}
                </button>
              </form>
            {/if}
          {/each}
        </div>
      {/if}

      <!-- Accept panel -->
      {#if hasAcceptTransition}
        <div class="border border-emerald-700/30 rounded p-4 bg-emerald-900/10 mb-4">
          <h3 class="text-emerald-300 text-sm font-medium mb-3">Accept Applicant</h3>

          {#if $acceptMessage}
            <div class="mb-3 px-3 py-2 rounded text-sm
              {$acceptMessage.startsWith('Failed') || $acceptMessage.startsWith('Cannot')
                ? 'bg-red-900/30 text-red-300 border border-red-700/30'
                : 'bg-green-900/30 text-green-300 border border-green-700/30'}">
              {$acceptMessage}
            </div>
          {/if}

          <form method="POST" action="?/acceptApplication" use:acceptEnhance class="space-y-3">
            <div>
              <label for="rank_id" class="block text-xs uppercase tracking-wide text-steel/60 mb-1">
                Starting Rank <span class="text-red-400">*</span>
              </label>
              <select
                id="rank_id"
                name="rank_id"
                bind:value={$acceptFormData.rank_id}
                class="w-full bg-night border border-night-border text-steel text-sm rounded px-3 py-2 focus:outline-none focus:border-ranger-tan/50"
              >
                <option value="">— Select rank —</option>
                {#each data.ranks as rank}
                  <option value={rank.id}>{rank.abbreviation} — {rank.name}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="unit_id" class="block text-xs uppercase tracking-wide text-steel/60 mb-1">
                Unit Assignment (optional)
              </label>
              <select
                id="unit_id"
                name="unit_id"
                bind:value={$acceptFormData.unit_id}
                class="w-full bg-night border border-night-border text-steel text-sm rounded px-3 py-2 focus:outline-none focus:border-ranger-tan/50"
              >
                <option value="">— Unassigned —</option>
                {#each data.units as unit}
                  <option value={unit.id}>{unit.abbreviation ? `${unit.abbreviation} — ` : ''}{unit.name}</option>
                {/each}
              </select>
            </div>

            <button
              type="submit"
              class="px-4 py-2 bg-emerald-700 text-emerald-100 font-medium text-sm rounded hover:bg-emerald-600 transition-colors"
            >
              Accept &amp; Create Soldier Profile
            </button>
          </form>
        </div>
      {/if}

      <!-- Deny / reject button -->
      {#if nonAcceptTransitions.some((s) => s.value === 'rejected')}
        <div class="border-t border-night-border pt-4">
          <form method="POST" action="?/reject" use:enhance>
            <button
              type="submit"
              class="px-4 py-2 bg-red-900/50 text-red-300 border border-red-700/30 font-medium text-sm rounded hover:bg-red-800/60 transition-colors"
              onclick={(e) => {
                if (!confirm('Are you sure you want to deny this application?')) e.preventDefault()
              }}
            >
              Deny Application
            </button>
          </form>
        </div>
      {/if}
    </div>

  <!-- Read-only for NCO -->
  {:else}
    <div class="bg-night-surface border border-night-border rounded p-4 text-steel/60 text-sm">
      You have read-only access to this application.
    </div>
  {/if}
</div>
