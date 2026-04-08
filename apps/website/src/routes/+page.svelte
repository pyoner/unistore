<svelte:head>
	<title>Website Examples</title>
</svelte:head>

<main class="home">
	<div class="panel">
		<p class="eyebrow">SvelteKit Demo</p>
		<h1>Example Routes</h1>
		<p class="lead">
			Explore a small todo app demo built as a nested route.
		</p>
		<a class="cta" href="/examples/todo">Open `/examples/todo`</a>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		min-height: 100vh;
		font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
		background: radial-gradient(circle at top, #f8fafc 0%, #e2e8f0 60%, #cbd5e1 100%);
		color: #0f172a;
	}

	.home {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
	}

	.panel {
		width: min(42rem, 100%);
		padding: 2rem;
		border-radius: 1.25rem;
		background: rgba(255, 255, 255, 0.85);
		backdrop-filter: blur(6px);
		box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2);
	}

	.eyebrow {
		margin: 0;
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #0369a1;
		font-weight: 700;
	}

	h1 {
		margin: 0.35rem 0 0;
		font-size: clamp(1.9rem, 4vw, 2.5rem);
	}

	.lead {
		margin: 0.9rem 0 1.35rem;
		line-height: 1.6;
		color: #334155;
	}

	.cta {
		display: inline-block;
		padding: 0.75rem 1.05rem;
		border-radius: 0.7rem;
		background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
		color: white;
		font-weight: 700;
		text-decoration: none;
	}

	.cta:hover {
		filter: brightness(1.06);
	}
</style>
