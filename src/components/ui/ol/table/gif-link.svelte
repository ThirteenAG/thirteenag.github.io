<script lang="ts">
	interface Props {
		url: string;
	}

	const { url }: Props = $props();
</script>

<a
	href={url}
	target="_blank"
	rel="noopener noreferrer"
	class="text-blue-600 underline cursor-pointer break-all">{url}</a
>
