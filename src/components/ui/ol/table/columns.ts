import { renderComponent } from "@/components/shadcn-svelte/data-table";
import type { ColumnDef } from "@tanstack/table-core";
import SortHeaderButton from "@/components/widgets/data-table/sort-header-button.svelte";
import GifLink from "./gif-link.svelte";
import GifPreview from "./gif-preview.svelte";

export type GOLTableData = {
    link: string;
    subtitle: string;
};

export const golColumns: ColumnDef<GOLTableData>[] = [
    {
        id: "preview",
        cell: ({ row }) => renderComponent(GifPreview, { url: row.original.link }),
        size: 32,
        minSize: 32,
        maxSize: 32,
    },
    {
        accessorKey: "link",
        header: "GIF Link",
        cell: ({ row }) => renderComponent(GifLink, { url: row.original.link }),
        size: 75,
        minSize: 75,
        maxSize: 75,
    },
    {
        accessorKey: "subtitle",
        header: ({ column }) =>
            renderComponent(SortHeaderButton, {
                title: "Subtitle",
                state: column.getIsSorted(),
                onclick: column.getToggleSortingHandler(),
            }),

    },
];

export type MOLTableData = GOLTableData;

export const molColumns: ColumnDef<MOLTableData>[] = golColumns;

export type GTTableData = {
    gxt: string;
    subtitle: string;
}

export const gtColumns: ColumnDef<GTTableData>[] = [
    {
        accessorKey: "gxt",
        header: ({ column }) =>
            renderComponent(SortHeaderButton, {
                title: "GXT",
                state: column.getIsSorted(),
                onclick: column.getToggleSortingHandler(),
            }),
        size: 75,
        minSize: 75,
        maxSize: 75,
    },
    {
        accessorKey: "subtitle",
        header: ({ column }) =>
            renderComponent(SortHeaderButton, {
                title: "Subtitle",
                state: column.getIsSorted(),
                onclick: column.getToggleSortingHandler(),
            }),

    },
];