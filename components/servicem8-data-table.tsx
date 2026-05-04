"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type Row,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TableOption = {
  label: string;
  value: string;
};

export type TableFilter = {
  columnId: string;
  label: string;
  options: TableOption[];
};

type ServiceM8DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  searchPlaceholder: string;
  getSearchText: (row: TData) => string;
  filters?: TableFilter[];
  groupOptions?: TableOption[];
  getGroupValue?: (row: TData, groupBy: string) => string;
  emptyMessage?: string;
  pageSizeOptions?: number[];
  initialPageSize?: number;
};

type GroupedPage<TData> = {
  label: string;
  rows: Row<TData>[];
};

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];

export function ServiceM8DataTable<TData>({
  data,
  columns,
  searchPlaceholder,
  getSearchText,
  filters = [],
  groupOptions = [],
  getGroupValue,
  emptyMessage = "No results found.",
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  initialPageSize = 10,
}: ServiceM8DataTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const [groupBy, setGroupBy] = React.useState("");

  const globalFilterFn = React.useCallback(
    (row: { original: TData }, _columnId: string, filterValue: string) => {
      const needle = filterValue.trim().toLowerCase();
      if (!needle) {
        return true;
      }

      return getSearchText(row.original).toLowerCase().includes(needle);
    },
    [getSearchText]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      columnFilters,
      sorting,
      pagination,
    },
    globalFilterFn,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  React.useEffect(() => {
    setPagination((current) => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }));
  }, [globalFilter, columnFilters, sorting, groupBy]);

  const pageRows = table.getRowModel().rows;

  const groupedRows = React.useMemo<GroupedPage<TData>[]>(() => {
    if (!groupBy || !getGroupValue) {
      return [{ label: "All results", rows: pageRows }];
    }

    const groups = new Map<string, Row<TData>[]>();
    const order: string[] = [];

    for (const row of pageRows) {
      const label = getGroupValue(row.original, groupBy) || "Unspecified";

      if (!groups.has(label)) {
        groups.set(label, []);
        order.push(label);
      }

      groups.get(label)!.push(row);
    }

    return order.map((label) => ({
      label,
      rows: groups.get(label) ?? [],
    }));
  }, [getGroupValue, groupBy, pageRows]);

  const isFiltered =
    globalFilter.length > 0 ||
    columnFilters.length > 0 ||
    sorting.length > 0 ||
    groupBy.length > 0 ||
    pagination.pageIndex > 0 ||
    pagination.pageSize !== initialPageSize;

  const resetTable = () => {
    setGlobalFilter("");
    setColumnFilters([]);
    setSorting([]);
    setGroupBy("");
    setPagination({ pageIndex: 0, pageSize: initialPageSize });
  };

  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(2,minmax(0,0.9fr))_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 pl-9"
          />
        </div>

        {filters.map((filter) => {
          const column = table.getColumn(filter.columnId);

          if (!column) {
            return null;
          }

          return (
            <Select
              key={filter.columnId}
              value={(column.getFilterValue() as string) || "all"}
              onValueChange={(value) => column.setFilterValue(value === "all" ? undefined : value)}
            >
              <SelectTrigger className="h-10 w-full">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        })}

        {groupOptions.length > 0 ? (
          <Select value={groupBy || "none"} onValueChange={(value) => setGroupBy(value === "none" ? "" : value)}>
            <SelectTrigger className="h-10 w-full">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              {groupOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div />
        )}

        <Button variant="outline" size="sm" onClick={resetTable} disabled={!isFiltered}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-200">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();

                    return (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3 h-8 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-900"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {groupedRows.length === 0 || pageRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-muted-foreground" colSpan={columns.length}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                groupedRows.map((group) => (
                  <React.Fragment key={group.label}>
                    {groupBy ? (
                      <tr className="border-b border-gray-200 bg-gray-50/80">
                        <td className="px-4 py-2 text-sm font-medium text-gray-700" colSpan={columns.length}>
                          {group.label}
                          <span className="ml-2 text-xs text-muted-foreground">({group.rows.length})</span>
                        </td>
                      </tr>
                    ) : null}
                    {group.rows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 align-top text-sm text-gray-700">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {pageRows.length} of {totalRows} results
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => setPagination({ pageIndex: 0, pageSize: Number(value) })}
            >
              <SelectTrigger className="h-9 w-[110px]">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="min-w-[90px] text-center text-sm text-muted-foreground">
              Page {pageCount === 0 ? 0 : pagination.pageIndex + 1} of {pageCount}
            </div>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
