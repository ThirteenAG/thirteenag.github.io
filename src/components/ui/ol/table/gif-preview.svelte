<script lang="ts">
	import { Button } from "@/components/shadcn-svelte/button";
	import * as Tooltip from "@/components/shadcn-svelte/tooltip";
	import { EyeIcon } from "@lucide/svelte";

	interface Props {
		url: string;
	}

	const { url }: Props = $props();
</script>

<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger class="cursor-pointer">
			<Button variant="ghost" size="icon" class="relative size-8 p-0">
				<EyeIcon />
			</Button>
		</Tooltip.Trigger>
		<Tooltip.Content
			class="bg-background p-2 shadow-lg"
			arrowClasses="bg-background"
		>
			<div class="relative w-64 aspect-video">
				<div
					aria-hidden="true"
					class="absolute inset-0 z-0 flex items-center justify-center"
				>
					<div
						class="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"
					></div>
				</div>

				<img
					src={url}
					alt="GIF"
					loading="lazy"
					decoding="async"
					class="relative z-10 w-full h-full object-contain"
				/>
			</div>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
