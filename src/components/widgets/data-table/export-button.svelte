<script lang="ts" generics="TData">
	import { mkConfig, generateCsv, download } from "export-to-csv";
	import { Button } from "@/components/shadcn-svelte/button";
	import type { Row, Table } from "@tanstack/table-core";

	const csvConfig = mkConfig({
		fieldSeparator: ",",
		decimalSeparator: ".",
		useKeysAsHeaders: true,
	});

	const handleExportRows = (rows: Row<TData>[]) => {
		const rowData = rows.map((row) => row.original);
		const csv = generateCsv(csvConfig)(rowData);
		download(csvConfig)(csv);
	};

	interface Props {
		table: Table<TData>;
	}

	const { table }: Props = $props();
</script>

<Button
	variant="default"
	onclick={() => handleExportRows(table.getFilteredRowModel().rows)}
>
	CSV
</Button>
