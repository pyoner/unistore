<script lang="ts">
	import { onDestroy } from 'svelte';
	import { createStore } from 'core';

	type Filter = 'all' | 'active' | 'done';

	type Todo = {
		id: number;
		title: string;
		done: boolean;
	};

	type TodoState = {
		draft: string;
		filter: Filter;
		todos: Todo[];
	};

	let seq = 4;
	const store = createStore<TodoState>({
		draft: '',
		filter: 'all',
		todos: [
			{ id: 1, title: 'Map feature scope', done: true },
			{ id: 2, title: 'Design task flow', done: false },
			{ id: 3, title: 'Ship demo page', done: false }
		]
	});
	let state = $state(store.get(''));

	const unsubscribe = store.subscribe('', (_key, _value, nextState) => {
		if (nextState) {
			state = nextState;
		}
	});

	onDestroy(unsubscribe);

	const remaining = $derived(state.todos.filter((todo) => !todo.done).length);
	const visibleTodos = $derived.by(() => {
		if (state.filter === 'active') {
			return state.todos.filter((todo) => !todo.done);
		}

		if (state.filter === 'done') {
			return state.todos.filter((todo) => todo.done);
		}

		return state.todos;
	});

	function addTodo() {
		const title = state.draft.trim();

		if (!title) {
			return;
		}

		store.set('/todos', [{ id: seq, title, done: false }, ...state.todos]);
		seq += 1;
		store.set('/draft', '');
	}

	function toggleTodo(id: number) {
		const index = state.todos.findIndex((item) => item.id === id);

		if (index !== -1) {
			const path = ['todos', `${index}` as `${number}`, 'done'] as const;
			store.set(path, !state.todos[index].done);
		}
	}

	function removeTodo(id: number) {
		const index = state.todos.findIndex((todo) => todo.id === id);

		if (index !== -1) {
			const path = ['todos', `${index}` as `${number}`] as const;
			store.remove(path);
		}
	}

	function clearDone() {
		store.set('/todos', state.todos.filter((todo) => !todo.done));
	}
</script>

<svelte:head>
	<title>Todo Example</title>
</svelte:head>

<main class="todo-page">
	<header class="topbar">
		<a href="/" class="back-link">← Back</a>
		<p class="tag">Example Route</p>
	</header>

	<section class="todo-shell">
		<h1>Todo App</h1>
		<p class="subtitle">A SvelteKit route at <code>/examples/todo</code> powered by <code>core</code>.</p>

		<div class="composer">
			<input
				type="text"
				value={state.draft}
				oninput={(event) =>
					store.set('/draft', (event.currentTarget as HTMLInputElement).value)}
				placeholder="Add a task"
				onkeydown={(event) => {
					if (event.key === 'Enter') {
						addTodo();
					}
				}}
			/>
			<button type="button" onclick={addTodo}>Add</button>
		</div>

		<div class="filters" role="group" aria-label="Filter todos">
			<button class:active={state.filter === 'all'} type="button" onclick={() => store.set('/filter', 'all')}>
				All
			</button>
			<button
				class:active={state.filter === 'active'}
				type="button"
				onclick={() => store.set('/filter', 'active')}
			>
				Active
			</button>
			<button class:active={state.filter === 'done'} type="button" onclick={() => store.set('/filter', 'done')}>
				Done
			</button>
		</div>

		{#if visibleTodos.length === 0}
			<p class="empty">No tasks in this filter.</p>
		{:else}
			<ul class="list">
				{#each visibleTodos as todo (todo.id)}
					<li>
						<label>
							<input
								type="checkbox"
								checked={todo.done}
								onchange={() => toggleTodo(todo.id)}
							/>
							<span class:done={todo.done}>{todo.title}</span>
						</label>
						<button type="button" class="delete" onclick={() => removeTodo(todo.id)}>
							Delete
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		<footer class="summary">
			<p>{remaining} task{remaining === 1 ? '' : 's'} left</p>
			<button type="button" class="clear" onclick={clearDone}>Clear done</button>
		</footer>
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
		background:
			radial-gradient(circle at 20% 0%, #dbeafe 0%, transparent 45%),
			radial-gradient(circle at 80% 15%, #cffafe 0%, transparent 40%),
			linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
		color: #0f172a;
	}

	.todo-page {
		min-height: 100vh;
		padding: 1.25rem;
		display: grid;
		align-content: start;
		gap: 1rem;
	}

	.topbar {
		width: min(52rem, 100%);
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.back-link {
		color: #075985;
		text-decoration: none;
		font-weight: 700;
	}

	.tag {
		margin: 0;
		font-size: 0.78rem;
		letter-spacing: 0.11em;
		text-transform: uppercase;
		font-weight: 700;
		color: #0e7490;
	}

	.todo-shell {
		width: min(52rem, 100%);
		margin: 0 auto;
		padding: 1.35rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(8px);
		box-shadow: 0 20px 55px rgba(15, 23, 42, 0.14);
	}

	h1 {
		margin: 0;
		font-size: clamp(1.7rem, 4vw, 2.2rem);
	}

	.subtitle {
		margin: 0.5rem 0 1rem;
		color: #334155;
	}

	.composer {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.6rem;
	}

	input[type='text'] {
		border: 1px solid #cbd5e1;
		border-radius: 0.7rem;
		padding: 0.7rem 0.8rem;
		font: inherit;
	}

	.composer button,
	.filters button,
	.delete,
	.clear {
		font: inherit;
		border: 0;
		border-radius: 0.65rem;
		padding: 0.6rem 0.85rem;
		cursor: pointer;
	}

	.composer button {
		background: linear-gradient(135deg, #0284c7, #0ea5e9);
		color: #f8fafc;
		font-weight: 700;
	}

	.filters {
		display: flex;
		gap: 0.45rem;
		margin: 0.9rem 0 0.65rem;
		flex-wrap: wrap;
	}

	.filters button {
		background: #e2e8f0;
		color: #1e293b;
	}

	.filters button.active {
		background: #0ea5e9;
		color: white;
	}

	.list {
		list-style: none;
		padding: 0;
		margin: 0.75rem 0;
		display: grid;
		gap: 0.45rem;
	}

	li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.7rem 0.8rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		background: #fff;
		gap: 0.6rem;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		min-width: 0;
	}

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	span.done {
		text-decoration: line-through;
		color: #64748b;
	}

	.delete {
		background: #fee2e2;
		color: #b91c1c;
	}

	.empty {
		margin: 1rem 0;
		padding: 0.8rem;
		border-radius: 0.7rem;
		background: #eff6ff;
		color: #1e40af;
	}

	.summary {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.9rem;
	}

	.summary p {
		margin: 0;
		color: #475569;
	}

	.clear {
		background: #e2e8f0;
		color: #1e293b;
	}

	@media (max-width: 540px) {
		.todo-shell {
			padding: 1rem;
		}

		.summary {
			flex-direction: column;
			align-items: stretch;
		}

		.clear {
			width: 100%;
		}
	}
</style>
