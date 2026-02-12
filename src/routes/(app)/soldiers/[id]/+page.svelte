<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte'
	import AttendanceStats from '$lib/components/AttendanceStats.svelte'
	import ServiceRecordTimeline from '$lib/components/ServiceRecordTimeline.svelte'
	import QualificationsList from '$lib/components/QualificationsList.svelte'
	import AwardsList from '$lib/components/AwardsList.svelte'
	import GrantQualForm from '$lib/components/GrantQualForm.svelte'
	import GrantAwardForm from '$lib/components/GrantAwardForm.svelte'
	import { superForm } from 'sveltekit-superforms/client'
	import { hasRole } from '$lib/auth/roles'
	import { SOLDIER_STATUSES } from '$lib/schemas/statusChangeAction'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const soldier = $derived(data.soldier)

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—'
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})
	}

	// Personnel action tab state
	let activePersonnelTab: 'promote' | 'transfer' | 'status' | 'note' = $state('promote')

	// Promote form
	const {
		form: promoteFormData,
		errors: promoteErrors,
		message: promoteMessage,
		enhance: promoteEnhance,
	} = data.promoteForm
		? superForm(data.promoteForm)
		: { form: { subscribe: () => () => {} }, errors: null, message: null, enhance: null }

	// Transfer form
	const {
		form: transferFormData,
		errors: transferErrors,
		message: transferMessage,
		enhance: transferEnhance,
	} = data.transferForm
		? superForm(data.transferForm)
		: { form: { subscribe: () => () => {} }, errors: null, message: null, enhance: null }

	// Status change form
	const {
		form: statusFormData,
		errors: statusErrors,
		message: statusMessage,
		enhance: statusEnhance,
	} = data.statusChangeForm
		? superForm(data.statusChangeForm)
		: { form: { subscribe: () => () => {} }, errors: null, message: null, enhance: null }

	// Add note form
	const {
		form: noteFormData,
		errors: noteErrors,
		message: noteMessage,
		enhance: noteEnhance,
	} = data.addNoteForm
		? superForm(data.addNoteForm)
		: { form: { subscribe: () => () => {} }, errors: null, message: null, enhance: null }

	// Derive new_rank_name from selected rank id for promote form
	let selectedRankId = $state('')
	const selectedRankName = $derived(
		data.allRanks.find((r) => r.id === selectedRankId)?.name ?? ''
	)

	// Derive new_unit_name from selected unit id for transfer form
	let selectedUnitId = $state('')
	const selectedUnitName = $derived(
		data.allUnits.find((u) => u.id === selectedUnitId)?.name ?? ''
	)

	// Status display labels
	const statusLabels: Record<string, string> = {
		active: 'Active',
		loa: 'LOA',
		awol: 'AWOL',
		discharged: 'Discharged',
		retired: 'Retired',
	}
</script>

<svelte:head>
	<title>{soldier.display_name} — Profile — ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
	<!-- Profile Header Card -->
	<div class="bg-night-surface border border-night-border rounded-lg p-6 mb-6">
		<div class="flex items-start gap-6">
			<!-- Rank Insignia (left) -->
			{#if soldier.rank?.insignia_url}
				<img
					src={soldier.rank.insignia_url}
					alt="{soldier.rank.name} insignia"
					class="w-20 h-20 object-contain shrink-0"
				/>
			{:else}
				<div class="w-20 h-20 bg-night-border rounded flex items-center justify-center shrink-0">
					<span class="text-steel text-xs font-tactical">{soldier.rank?.abbreviation ?? '—'}</span>
				</div>
			{/if}

			<!-- Name, Rank, Status (center) -->
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-3 mb-1 flex-wrap">
					<h1 class="text-2xl font-bold text-ranger-tan font-tactical">
						{soldier.display_name}
					</h1>
					<StatusBadge status={soldier.status} />
					{#if data.isOwnProfile}
						<span class="text-od-green-light text-xs uppercase font-bold tracking-wider">Your Profile</span>
					{/if}
				</div>
				<p class="text-steel text-lg">
					{soldier.rank?.name ?? 'Unranked'}
					{#if soldier.rank?.abbreviation}
						<span class="text-steel/60">({soldier.rank.abbreviation})</span>
					{/if}
				</p>
				{#if soldier.callsign}
					<p class="text-steel/70 text-sm mt-1">
						Callsign: <span class="text-ranger-tan">{soldier.callsign}</span>
					</p>
				{/if}
				{#if soldier.mos}
					<p class="text-steel/70 text-sm">
						MOS: <span class="text-ranger-tan">{soldier.mos}</span>
					</p>
				{/if}
			</div>
		</div>

		<!-- Unit Assignment + Join Date -->
		<div class="mt-4 pt-4 border-t border-night-border flex flex-wrap gap-6 text-sm">
			<div>
				<span class="text-steel/50 uppercase text-xs tracking-wider block mb-0.5">Unit</span>
				<p class="text-steel">{soldier.unit?.name ?? 'Unassigned'}</p>
			</div>
			<div>
				<span class="text-steel/50 uppercase text-xs tracking-wider block mb-0.5">Joined</span>
				<p class="text-steel">{formatDate(soldier.joined_at)}</p>
			</div>
		</div>
	</div>

	<!-- Awards & Qualifications Section (full width) -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
		<!-- Qualifications Panel -->
		<div class="bg-night-surface border border-night-border rounded-lg p-4">
			<h2 class="text-lg font-bold text-ranger-tan font-tactical mb-3">Qualifications</h2>
			<QualificationsList qualifications={data.memberQualifications} />
		</div>

		<!-- Awards & Decorations Panel -->
		<div class="bg-night-surface border border-night-border rounded-lg p-4">
			<h2 class="text-lg font-bold text-ranger-tan font-tactical mb-3">Awards & Decorations</h2>
			<AwardsList awards={data.memberAwards} />
		</div>
	</div>

	<!-- Admin Actions (Grant Forms) — visible only to NCO+/Command+ -->
	{#if hasRole(data.userRole, 'nco') || hasRole(data.userRole, 'command')}
		<div class="border border-od-green/30 rounded-lg p-4 mb-6 bg-od-green/5">
			<h2 class="text-sm font-bold text-od-green-light font-tactical uppercase tracking-wider mb-4">
				Admin Actions
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#if hasRole(data.userRole, 'nco')}
					<div>
						<h3 class="text-ranger-tan font-medium text-sm mb-3">Grant Qualification</h3>
						<GrantQualForm form={data.grantQualForm} qualifications={data.qualifications} />
					</div>
				{/if}

				{#if hasRole(data.userRole, 'command')}
					<div>
						<h3 class="text-ranger-tan font-medium text-sm mb-3">Grant Award</h3>
						<GrantAwardForm form={data.grantAwardForm} awards={data.awards} />
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Personnel Actions Panel — Command+ only -->
	{#if hasRole(data.userRole, 'command')}
		<div class="border border-night-border rounded-lg p-4 mb-6 bg-night-surface">
			<h2 class="text-sm font-bold text-ranger-tan font-tactical uppercase tracking-wider mb-4">
				Personnel Actions
			</h2>

			<!-- Tab navigation -->
			<div class="flex gap-1 mb-4 border-b border-night-border pb-2">
				<button
					type="button"
					onclick={() => (activePersonnelTab = 'promote')}
					class="px-3 py-1.5 text-xs font-tactical uppercase tracking-wider rounded transition-colors {activePersonnelTab === 'promote' ? 'bg-olive/20 text-ranger-tan' : 'bg-night-border text-steel hover:text-ranger-tan'}"
				>
					Promote / Demote
				</button>
				<button
					type="button"
					onclick={() => (activePersonnelTab = 'transfer')}
					class="px-3 py-1.5 text-xs font-tactical uppercase tracking-wider rounded transition-colors {activePersonnelTab === 'transfer' ? 'bg-olive/20 text-ranger-tan' : 'bg-night-border text-steel hover:text-ranger-tan'}"
				>
					Transfer
				</button>
				{#if hasRole(data.userRole, 'admin')}
					<button
						type="button"
						onclick={() => (activePersonnelTab = 'status')}
						class="px-3 py-1.5 text-xs font-tactical uppercase tracking-wider rounded transition-colors {activePersonnelTab === 'status' ? 'bg-alert/20 text-alert' : 'bg-night-border text-steel hover:text-ranger-tan'}"
					>
						Status Change
					</button>
				{/if}
				<button
					type="button"
					onclick={() => (activePersonnelTab = 'note')}
					class="px-3 py-1.5 text-xs font-tactical uppercase tracking-wider rounded transition-colors {activePersonnelTab === 'note' ? 'bg-olive/20 text-ranger-tan' : 'bg-night-border text-steel hover:text-ranger-tan'}"
				>
					Add Note
				</button>
			</div>

			<!-- Promote / Demote Tab -->
			{#if activePersonnelTab === 'promote' && data.promoteForm}
				<div>
					<p class="text-steel/60 text-xs mb-3">
						Current rank: <span class="text-steel">{soldier.rank?.name ?? 'Unranked'}</span>
						{#if soldier.rank?.abbreviation}
							<span class="text-steel/50">({soldier.rank.abbreviation})</span>
						{/if}
					</p>
					<form method="POST" action="?/promote" use:promoteEnhance class="space-y-3">
						<!-- Hidden from_rank fields -->
						<input type="hidden" name="from_rank_id" value={soldier.rank?.id ?? ''} />
						<input type="hidden" name="from_rank_name" value={soldier.rank?.name ?? ''} />
						<!-- Hidden new_rank_name derived from selection -->
						<input type="hidden" name="new_rank_name" value={selectedRankName} />

						<div>
							<label class="block text-xs text-steel/70 uppercase tracking-wider mb-1" for="promote-rank">
								New Rank
							</label>
							<select
								id="promote-rank"
								name="new_rank_id"
								bind:value={selectedRankId}
								required
								class="w-full bg-night border border-night-border text-steel rounded px-3 py-2 text-sm focus:outline-none focus:border-olive"
							>
								<option value="">— Select rank —</option>
								{#each data.allRanks as rank (rank.id)}
									{#if rank.id !== soldier.rank?.id}
										<option value={rank.id}>{rank.name} ({rank.abbreviation})</option>
									{/if}
								{/each}
							</select>
							{#if $promoteErrors?.new_rank_id}
								<p class="text-alert text-xs mt-1">{$promoteErrors.new_rank_id}</p>
							{/if}
						</div>

						<div>
							<label class="block text-xs text-steel/70 uppercase tracking-wider mb-1" for="promote-reason">
								Reason
							</label>
							<textarea
								id="promote-reason"
								name="reason"
								required
								rows="3"
								minlength="5"
								maxlength="500"
								placeholder="State the reason for this rank change..."
								class="w-full bg-night border border-night-border text-steel rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-olive"
							></textarea>
							{#if $promoteErrors?.reason}
								<p class="text-alert text-xs mt-1">{$promoteErrors.reason}</p>
							{/if}
						</div>

						{#if $promoteMessage}
							<p class="text-xs {$promoteMessage.startsWith('Failed') ? 'text-alert' : 'text-od-green-light'}">
								{$promoteMessage}
							</p>
						{/if}

						<button
							type="submit"
							class="bg-olive text-night font-tactical text-xs uppercase tracking-wider px-4 py-2 rounded hover:bg-olive/80 transition-colors"
						>
							Record Rank Change
						</button>
					</form>
				</div>
			{/if}

			<!-- Transfer Tab -->
			{#if activePersonnelTab === 'transfer' && data.transferForm}
				<div>
					<p class="text-steel/60 text-xs mb-3">
						Current unit: <span class="text-steel">{soldier.unit?.name ?? 'Unassigned'}</span>
					</p>
					<form method="POST" action="?/transfer" use:transferEnhance class="space-y-3">
						<!-- Hidden from_unit fields -->
						<input type="hidden" name="from_unit_id" value={soldier.unit?.id ?? ''} />
						<input type="hidden" name="from_unit_name" value={soldier.unit?.name ?? ''} />
						<!-- Hidden new_unit_name derived from selection -->
						<input type="hidden" name="new_unit_name" value={selectedUnitName} />

						<div>
							<label class="block text-xs text-steel/70 uppercase tracking-wider mb-1" for="transfer-unit">
								Destination Unit
							</label>
							<select
								id="transfer-unit"
								name="new_unit_id"
								bind:value={selectedUnitId}
								required
								class="w-full bg-night border border-night-border text-steel rounded px-3 py-2 text-sm focus:outline-none focus:border-olive"
							>
								<option value="">— Select unit —</option>
								{#each data.allUnits as unit (unit.id)}
									<option value={unit.id}>{unit.name}</option>
								{/each}
							</select>
							{#if $transferErrors?.new_unit_id}
								<p class="text-alert text-xs mt-1">{$transferErrors.new_unit_id}</p>
							{/if}
						</div>

						<div>
							<label class="block text-xs text-steel/70 uppercase tracking-wider mb-1" for="transfer-date">
								Effective Date
							</label>
							<input
								id="transfer-date"
								type="date"
								name="effective_date"
								required
								class="w-full bg-night border border-night-border text-steel rounded px-3 py-2 text-sm focus:outline-none focus:border-olive"
							/>
							{#if $transferErrors?.effective_date}
								<p class="text-alert text-xs mt-1">{$transferErrors.effective_date}</p>
							{/if}
						</div>

						<div>
							<label class="block text-xs text-steel/70 uppercase tracking-wider mb-1" for="transfer-reason">
								Reason
							</label>
							<textarea
								id="transfer-reason"
								name="reason"
								required
								rows="3"
								minlength="5"
								maxlength="500"
								placeholder="State the reason for this transfer..."
								class="w-full bg-night border border-night-border text-steel rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-olive"
							></textarea>
							{#if $transferErrors?.reason}
								<p class="text-alert text-xs mt-1">{$transferErrors.reason}</p>
							{/if}
						</div>

						{#if $transferMessage}
							<p class="text-xs {$transferMessage.startsWith('Failed') ? 'text-alert' : 'text-od-green-light'}">
								{$transferMessage}
							</p>
						{/if}

						<button
							type="submit"
							class="bg-olive text-night font-tactical text-xs uppercase tracking-wider px-4 py-2 rounded hover:bg-olive/80 transition-colors"
						>
							Issue Transfer Order
						</button>
					</form>
				</div>
			{/if}

			<!-- Status Change Tab — Admin only -->
			{#if activePersonnelTab === 'status' && hasRole(data.userRole, 'admin') && data.statusChangeForm}
				<div>
					<p class="text-steel/60 text-xs mb-3">
						Current status: <span class="text-steel">{statusLabels[soldier.status ?? ''] ?? soldier.status ?? '—'}</span>
					</p>
					<form method="POST" action="?/statusChange" use:statusEnhance class="space-y-3">
						<!-- Hidden from_status field -->
						<input type="hidden" name="from_status" value={soldier.status ?? ''} />

						<div>
							<label class="block text-xs text-steel/70 uppercase tracking-wider mb-1" for="status-new">
								New Status
							</label>
							<select
								id="status-new"
								name="new_status"
								required
								class="w-full bg-night border border-night-border text-steel rounded px-3 py-2 text-sm focus:outline-none focus:border-alert"
							>
								<option value="">— Select status —</option>
								{#each SOLDIER_STATUSES as s}
									{#if s !== soldier.status}
										<option value={s}>{statusLabels[s] ?? s}</option>
									{/if}
								{/each}
							</select>
							{#if $statusErrors?.new_status}
								<p class="text-alert text-xs mt-1">{$statusErrors.new_status}</p>
							{/if}
						</div>

						<div>
							<label class="block text-xs text-steel/70 uppercase tracking-wider mb-1" for="status-reason">
								Reason
							</label>
							<textarea
								id="status-reason"
								name="reason"
								required
								rows="3"
								minlength="5"
								maxlength="500"
								placeholder="State the reason for this status change..."
								class="w-full bg-night border border-night-border text-steel rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-alert"
							></textarea>
							{#if $statusErrors?.reason}
								<p class="text-alert text-xs mt-1">{$statusErrors.reason}</p>
							{/if}
						</div>

						{#if $statusMessage}
							<p class="text-xs {$statusMessage.startsWith('Failed') ? 'text-alert' : 'text-od-green-light'}">
								{$statusMessage}
							</p>
						{/if}

						<button
							type="submit"
							class="bg-alert text-night font-tactical text-xs uppercase tracking-wider px-4 py-2 rounded hover:bg-alert/80 transition-colors"
						>
							Change Status
						</button>
					</form>
				</div>
			{/if}

			<!-- Add Note Tab — Command+ only -->
			{#if activePersonnelTab === 'note' && data.addNoteForm}
				<div>
					<p class="text-steel/50 text-xs mb-3 italic">
						This note will be visible only to NCO and above.
					</p>
					<form method="POST" action="?/addNote" use:noteEnhance class="space-y-3">
						<div>
							<label class="block text-xs text-steel/70 uppercase tracking-wider mb-1" for="note-text">
								Note
							</label>
							<textarea
								id="note-text"
								name="note_text"
								required
								rows="5"
								minlength="10"
								maxlength="2000"
								placeholder="Enter leadership note (min 10 characters)..."
								class="w-full bg-night border border-night-border text-steel rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-olive"
							></textarea>
							{#if $noteErrors?.note_text}
								<p class="text-alert text-xs mt-1">{$noteErrors.note_text}</p>
							{/if}
						</div>

						{#if $noteMessage}
							<p class="text-xs {$noteMessage.startsWith('Failed') ? 'text-alert' : 'text-od-green-light'}">
								{$noteMessage}
							</p>
						{/if}

						<button
							type="submit"
							class="bg-olive text-night font-tactical text-xs uppercase tracking-wider px-4 py-2 rounded hover:bg-olive/80 transition-colors"
						>
							Add Note
						</button>
					</form>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Two-column layout for stats and record -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left Column: Attendance Stats (1/3 width on lg) -->
		<div class="lg:col-span-1 space-y-6">
			<div>
				<h2 class="text-lg font-bold text-ranger-tan font-tactical mb-3">Attendance</h2>
				<AttendanceStats
					operationCount={data.attendanceStats.operationCount}
					totalOperations={data.attendanceStats.totalOperations}
					attendancePercent={data.attendanceStats.attendancePercent}
					lastActiveDate={data.attendanceStats.lastActiveDate}
				/>
			</div>

			<!-- Assignment History (from transfer service records) -->
			{#if data.assignmentHistory.length > 0}
				<div>
					<h2 class="text-lg font-bold text-ranger-tan font-tactical mb-3">Assignment History</h2>
					<div class="bg-night-surface border border-night-border rounded-lg p-4 space-y-2">
						{#each data.assignmentHistory as entry (entry.occurred_at)}
							<div class="text-sm border-b border-night-border last:border-0 pb-2 last:pb-0">
								<p class="text-steel">
									{(entry.payload.from_unit_name as string | undefined) ?? '—'}
									→
									{(entry.payload.to_unit_name as string | undefined) ?? '—'}
								</p>
								<p class="text-steel/50 text-xs">{formatDate(entry.occurred_at)}</p>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Right Column: Service Record + Combat Record (2/3 width on lg) -->
		<div class="lg:col-span-2 space-y-6">
			<div>
				<h2 class="text-lg font-bold text-ranger-tan font-tactical mb-3">Service Record</h2>
				<div class="bg-night-surface border border-night-border rounded-lg p-4">
					<ServiceRecordTimeline records={data.serviceRecords} />
				</div>
			</div>

			<!-- Combat Record -->
			{#if data.combatRecord.length > 0}
				<div>
					<h2 class="text-lg font-bold text-ranger-tan font-tactical mb-3">Combat Record</h2>
					<div class="bg-night-surface border border-night-border rounded-lg p-4">
						<table class="w-full text-left text-sm">
							<thead>
								<tr class="border-b border-night-border text-ranger-tan font-tactical text-xs uppercase">
									<th class="pb-2 pr-4">Operation</th>
									<th class="pb-2 pr-4">Type</th>
									<th class="pb-2 pr-4">Role</th>
									<th class="pb-2">Status</th>
								</tr>
							</thead>
							<tbody>
								{#each data.combatRecord as entry (entry.id)}
									<tr class="border-b border-night-border last:border-0">
										<td class="py-2 pr-4 text-steel">{entry.operation?.title ?? 'Unknown'}</td>
										<td class="py-2 pr-4 text-steel/70">{entry.operation?.operation_type ?? '—'}</td>
										<td class="py-2 pr-4 text-steel">{entry.role_held ?? '—'}</td>
										<td class="py-2">
											<span
												class="text-xs uppercase {entry.status === 'present'
													? 'text-od-green-light'
													: entry.status === 'excused'
														? 'text-ranger-tan-muted'
														: 'text-alert'}"
											>
												{entry.status}
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
