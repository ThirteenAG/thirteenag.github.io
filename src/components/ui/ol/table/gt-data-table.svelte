<script lang="ts">
	import DataTable from "@/components/widgets/data-table/data-table.svelte";
	import { gtColumns, type GTTableData } from "./columns";

	interface Props {
		data: GTTableData[];
	}

	const { data }: Props = $props();
</script>

<DataTable filter="subtitle" {data} columns={gtColumns} />
