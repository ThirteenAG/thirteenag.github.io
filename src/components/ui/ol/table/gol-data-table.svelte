<script lang="ts">
	import DataTable from "@/components/widgets/data-table/data-table.svelte";
	import { golColumns, type GOLTableData } from "./columns";

	interface Props {
		data: GOLTableData[];
	}

	const { data }: Props = $props();
</script>

<DataTable filter="subtitle" {data} columns={golColumns} />
