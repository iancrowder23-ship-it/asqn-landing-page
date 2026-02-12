<script lang="ts">
  import type { PageData } from './$types'
  import { superForm } from 'sveltekit-superforms/client'
  import { formatDate } from '$lib/utils/date'

  let { data }: { data: PageData } = $props()

  const { form, errors, enhance, message: formMessage } = superForm(data.form)
</script>

<svelte:head>
  <title>Edit Event -- ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-8">
  <div class="mb-6">
    <a href="/events" class="text-steel hover:text-ranger-tan text-sm transition-colors">&larr; Back to Events</a>
  </div>

  <h1 class="text-2xl font-bold text-ranger-tan font-tactical mb-2">Edit Event</h1>
  <p class="text-steel/60 text-sm mb-6">{data.event.title}</p>

  {#if $formMessage}
    <div class="mb-4 px-4 py-3 rounded bg-alert/20 text-alert text-sm border border-alert/30">
      {$formMessage}
    </div>
  {/if}

  <form method="POST" use:enhance class="space-y-5">
    <div>
      <label for="title" class="block text-steel text-sm font-semibold mb-1">Title</label>
      <input
        id="title"
        name="title"
        type="text"
        bind:value={$form.title}
        class="bg-night border border-night-border rounded px-3 py-2 text-steel focus:border-od-green focus:outline-none w-full"
      />
      {#if $errors.title}
        <p class="text-alert text-xs mt-1">{$errors.title}</p>
      {/if}
    </div>

    <div>
      <label for="event_type" class="block text-steel text-sm font-semibold mb-1">Event Type</label>
      <select
        id="event_type"
        name="event_type"
        bind:value={$form.event_type}
        class="bg-night border border-night-border rounded px-3 py-2 text-steel focus:border-od-green focus:outline-none w-full"
      >
        <option value="operation">Operation</option>
        <option value="training">Training</option>
        <option value="ftx">FTX</option>
      </select>
      {#if $errors.event_type}
        <p class="text-alert text-xs mt-1">{$errors.event_type}</p>
      {/if}
    </div>

    <div>
      <label for="event_date" class="block text-steel text-sm font-semibold mb-1">
        Date <span class="text-steel/60 font-normal">(Zulu/UTC)</span>
      </label>
      <input
        id="event_date"
        name="event_date"
        type="datetime-local"
        bind:value={$form.event_date}
        class="bg-night border border-night-border rounded px-3 py-2 text-steel focus:border-od-green focus:outline-none w-full"
      />
      {#if $errors.event_date}
        <p class="text-alert text-xs mt-1">{$errors.event_date}</p>
      {/if}
    </div>

    <div>
      <label for="description" class="block text-steel text-sm font-semibold mb-1">Description <span class="text-steel/60 font-normal">(optional)</span></label>
      <textarea
        id="description"
        name="description"
        bind:value={$form.description}
        rows="4"
        class="bg-night border border-night-border rounded px-3 py-2 text-steel focus:border-od-green focus:outline-none w-full resize-none"
      ></textarea>
      {#if $errors.description}
        <p class="text-alert text-xs mt-1">{$errors.description}</p>
      {/if}
    </div>

    <div>
      <label for="status" class="block text-steel text-sm font-semibold mb-1">Status</label>
      <select
        id="status"
        name="status"
        bind:value={$form.status}
        class="bg-night border border-night-border rounded px-3 py-2 text-steel focus:border-od-green focus:outline-none w-full"
      >
        {#each data.eventStatuses as s}
          <option value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
        {/each}
      </select>
      {#if $errors.status}
        <p class="text-alert text-xs mt-1">{$errors.status}</p>
      {/if}
      {#if $form.status === 'cancelled'}
        <p class="text-alert text-xs mt-1">This event will be marked as cancelled.</p>
      {/if}
    </div>

    <div class="pt-2">
      <button
        type="submit"
        class="bg-od-green text-night font-bold px-6 py-2 rounded hover:bg-od-green-light transition-colors"
      >
        Save Changes
      </button>
    </div>
  </form>
</div>
