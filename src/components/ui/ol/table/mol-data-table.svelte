<script lang="ts">
	import DataTable from "@/components/widgets/data-table/data-table.svelte";
	import { molColumns, type MOLTableData } from "./columns";

	interface Props {
		data: MOLTableData[];
	}

	const { data }: Props = $props();
</script>

<DataTable filter="subtitle" {data} columns={molColumns} />
