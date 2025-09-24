<script lang="ts">
	import { Button } from "@/components/shadcn-svelte/button";
	import type { SortDirection } from "@tanstack/table-core";
	import type { ComponentProps } from "svelte";
	import { ArrowUpDownIcon } from "@lucide/svelte";

	interface Props extends ComponentProps<typeof Button> {
		title: string;
		state: SortDirection | false;
	}

	const { title, state, variant = "ghost", ...restProps }: Props = $props();
</script>

<Button
	{variant}
	{...restProps}
	style="font-size: inherit; color: inherit; font-weight: inherit"
>
	{title}
	<ArrowUpDownIcon
		class={{
			"stroke-muted-foreground": true,
			"[&>path:nth-of-type(-n+2)]:stroke-foreground": state === "desc",
			"[&>path:nth-last-of-type(-n+2)]:stroke-foreground":
				state === "asc",
		}}
	/>
</Button>
