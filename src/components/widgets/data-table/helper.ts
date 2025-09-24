import type { ColumnDef } from "@tanstack/table-core";

export function widthStye<TData>(columnDef: ColumnDef<TData, unknown>) {
    var style = "";
    if (columnDef.size) {
        style += `width: ${columnDef.size}px;`;
    }
    if (columnDef.minSize) {
        style += `min-width: ${columnDef.minSize}px;`;
    }
    if (columnDef.maxSize) {
        style += `max-width: ${columnDef.maxSize}px;`;
    }
    return style;
}