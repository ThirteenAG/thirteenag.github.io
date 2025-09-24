<script lang="ts" generics="TData, TValue">
	import {
		createSvelteTable,
		FlexRender,
	} from "@/components/shadcn-svelte/data-table";
	import {
		type ColumnDef,
		type ColumnFiltersState,
		getCoreRowModel,
		getFilteredRowModel,
		getPaginationRowModel,
		getSortedRowModel,
		type PaginationState,
		type Row,
		type SortingState,
	} from "@tanstack/table-core";
	import { Input } from "@/components/shadcn-svelte/input";
	import * as Pagination from "@/components/shadcn-svelte/pagination";
	import * as Select from "@/components/shadcn-svelte/select";
	import * as Table from "@/components/shadcn-svelte/table";

	interface Props<TData, TValue> {
		filter?: keyof TData & string;
		columns: ColumnDef<TData, TValue>[];
		data: TData[];
	}

	const { filter, columns, data }: Props<TData, TValue> = $props();

	const pageSizes = [10, 20, 30, 40, 50];

	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);

	const table = createSvelteTable({
		get data() {
			return data;
		},
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onSortingChange: (updater) => {
			sorting =
				typeof updater === "function" ? updater(sorting) : updater;
		},
		onPaginationChange: (updater) => {
			pagination =
				typeof updater === "function" ? updater(pagination) : updater;
		},
		onColumnFiltersChange: (updater) => {
			columnFilters =
				typeof updater === "function"
					? updater(columnFilters)
					: updater;
		},
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get columnFilters() {
				return columnFilters;
			},
		},
	});

	import { widthStye } from "./helper";
	import ExportButton from "./export-button.svelte";
</script>

<div class="w-full flex flex-col gap-4">
	<div class="flex flex-row justify-between items-center">
		<!-- Page Size Selector -->
		<div class="flex items-center gap-2">
			<span> Show </span>
			<Select.Root type="single">
				<Select.Trigger>
					{pagination.pageSize}
				</Select.Trigger>

				<Select.Content>
					{#each pageSizes as size}
						<Select.Item
							value={size.toString()}
							label={size.toString()}
							onclick={() => table.setPageSize(size)}
						>
							{size}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<span> entries </span>
		</div>

		<!-- Filter -->
		{#if filter}
			<div class="flex items-center gap-2">
				<span>Search:</span>
				<Input
					placeholder={filter}
					value={(table
						.getColumn(filter)
						?.getFilterValue() as string) ?? ""}
					onchange={(e) => {
						table
							.getColumn(filter)
							?.setFilterValue(e.currentTarget.value);
					}}
					oninput={(e) => {
						table
							.getColumn(filter)
							?.setFilterValue(e.currentTarget.value);
					}}
					class="max-w-sm"
				/>
			</div>
		{/if}
	</div>

	<!-- Table -->
	<Table.Root>
		<Table.Header>
			{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
				<Table.Row>
					{#each headerGroup.headers as header (header.id)}
						<Table.Head
							class="text-center font-bold text-lg w-full"
							style={widthStye(header.column.columnDef)}
						>
							{#if !header.isPlaceholder}
								<FlexRender
									content={header.column.columnDef.header}
									context={header.getContext()}
								/>
							{/if}
						</Table.Head>
					{/each}
				</Table.Row>
			{/each}
		</Table.Header>

		<Table.Body>
			{#each table.getRowModel().rows as row (row.id)}
				<Table.Row>
					{#each row.getVisibleCells() as cell (cell.id)}
						<Table.Cell
							class="text-md text-center whitespace-break-spaces text-wrap w-full"
							style={widthStye(cell.column.columnDef)}
						>
							<div class="flex items-center justify-center">
								<FlexRender
									content={cell.column.columnDef.cell}
									context={cell.getContext()}
								/>
							</div>
						</Table.Cell>
					{/each}
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell
						colspan={columns.length}
						class="h-24 text-center"
					>
						No results.
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>

	<!-- Pagination Info -->
	<div class="text-sm text-muted-foreground text-center">
		{`Showing ${pagination.pageIndex * pagination.pageSize + 1} to ${Math.min(
			(pagination.pageIndex + 1) * pagination.pageSize,
			table.getRowCount(),
		)} of ${table.getRowCount()} results.`}
	</div>

	<!-- Pagination -->
	<Pagination.Root
		count={table.getRowCount()}
		perPage={pagination.pageSize}
		page={pagination.pageIndex + 1}
	>
		{#snippet children({ pages, currentPage })}
			<Pagination.Content>
				<Pagination.Item>
					<Pagination.PrevButton
						onclick={() => table.previousPage()}
					/>
				</Pagination.Item>

				{#each pages as page (page.key)}
					<Pagination.Item>
						{#if page.type === "ellipsis"}
							<Pagination.Ellipsis />
						{:else}
							<Pagination.Link
								{page}
								isActive={currentPage === page.value}
								onclick={() =>
									table.setPageIndex(page.value - 1)}
							>
								{page.value}
							</Pagination.Link>
						{/if}
					</Pagination.Item>
				{/each}

				<Pagination.Item>
					<Pagination.NextButton onclick={() => table.nextPage()} />
				</Pagination.Item>
			</Pagination.Content>
		{/snippet}
	</Pagination.Root>

	<!-- Export -->
	<div class="flex justify-center items-center">
		<ExportButton {table} />
	</div>
</div>
