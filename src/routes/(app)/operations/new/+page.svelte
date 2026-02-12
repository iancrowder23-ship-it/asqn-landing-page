<script lang="ts">
  import type { PageData } from './$types'
  import { superForm } from 'sveltekit-superforms/client'

  let { data }: { data: PageData } = $props()

  const { form, errors, enhance, submitting } = superForm(data.form)
</script>

<svelte:head>
  <title>Create Operation — ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-8">
  <div class="mb-6">
    <a href="/operations" class="text-steel/60 hover:text-steel text-sm transition-colors">
      &larr; Back to Operations
    </a>
  </div>

  <h1 class="text-2xl font-tactical font-bold text-ranger-tan tracking-wider mb-6">
    Create Operation
  </h1>

  <form method="POST" use:enhance class="bg-night-surface border border-night-border rounded p-6 space-y-5">

    <!-- Title -->
    <div>
      <label for="title" class="block text-sm font-medium text-steel/80 mb-1">
        Title <span class="text-alert">*</span>
      </label>
      <input
        id="title"
        name="title"
        type="text"
        bind:value={$form.title}
        placeholder="Op IRON FIST"
        class="w-full bg-night border border-night-border rounded px-3 py-2 text-steel text-sm focus:outline-none focus:border-ranger-tan/50 placeholder:text-steel/30"
      />
      {#if $errors.title}
        <p class="mt-1 text-xs text-alert">{$errors.title}</p>
      {/if}
    </div>

    <!-- Date -->
    <div>
      <label for="operation_date" class="block text-sm font-medium text-steel/80 mb-1">
        Date <span class="text-alert">*</span>
        <span class="text-steel/50 font-normal ml-1">(Zulu/UTC)</span>
      </label>
      <input
        id="operation_date"
        name="operation_date"
        type="datetime-local"
        bind:value={$form.operation_date}
        class="w-full bg-night border border-night-border rounded px-3 py-2 text-steel text-sm focus:outline-none focus:border-ranger-tan/50"
      />
      {#if $errors.operation_date}
        <p class="mt-1 text-xs text-alert">{$errors.operation_date}</p>
      {/if}
    </div>

    <!-- Operation Type -->
    <div>
      <label for="operation_type" class="block text-sm font-medium text-steel/80 mb-1">
        Type <span class="text-alert">*</span>
      </label>
      <select
        id="operation_type"
        name="operation_type"
        bind:value={$form.operation_type}
        class="w-full bg-night border border-night-border rounded px-3 py-2 text-steel text-sm focus:outline-none focus:border-ranger-tan/50"
      >
        <option value="">Select type...</option>
        {#each data.operationTypes as type}
          <option value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
        {/each}
      </select>
      {#if $errors.operation_type}
        <p class="mt-1 text-xs text-alert">{$errors.operation_type}</p>
      {/if}
    </div>

    <!-- Status -->
    <div>
      <label for="status" class="block text-sm font-medium text-steel/80 mb-1">
        Status <span class="text-alert">*</span>
      </label>
      <select
        id="status"
        name="status"
        bind:value={$form.status}
        class="w-full bg-night border border-night-border rounded px-3 py-2 text-steel text-sm focus:outline-none focus:border-ranger-tan/50"
      >
        <option value="completed">Completed</option>
        <option value="scheduled">Scheduled</option>
        <option value="cancelled">Cancelled</option>
      </select>
      {#if $errors.status}
        <p class="mt-1 text-xs text-alert">{$errors.status}</p>
      {/if}
    </div>

    <!-- Description -->
    <div>
      <label for="description" class="block text-sm font-medium text-steel/80 mb-1">
        Description <span class="text-steel/50 font-normal">(optional)</span>
      </label>
      <textarea
        id="description"
        name="description"
        bind:value={$form.description}
        rows="4"
        placeholder="Brief operation summary..."
        class="w-full bg-night border border-night-border rounded px-3 py-2 text-steel text-sm focus:outline-none focus:border-ranger-tan/50 placeholder:text-steel/30 resize-none"
      ></textarea>
      {#if $errors.description}
        <p class="mt-1 text-xs text-alert">{$errors.description}</p>
      {/if}
    </div>

    <div class="pt-2">
      <button
        type="submit"
        disabled={$submitting}
        class="px-6 py-2 bg-od-green/20 text-od-green border border-od-green/40 rounded text-sm font-medium hover:bg-od-green/30 transition-colors uppercase tracking-wide disabled:opacity-50"
      >
        {$submitting ? 'Creating...' : 'Create Operation'}
      </button>
    </div>
  </form>
</div>
