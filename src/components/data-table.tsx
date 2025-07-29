"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { categories } from "../App";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Input } from "./ui/input";
import { DataTableToolbar } from "./data-table-search";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [pagination, setPagination] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterClips, setFilterClips] = useState<string>();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      pagination: { pageIndex: pagination, pageSize: pageSize },
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const selectedCategories = filterValue as string[];

      // If no categories are selected, show all rows
      if (!selectedCategories || selectedCategories.length === 0) {
        return true;
      }

      // Get the category value from the row
      const rowCategory = row.getValue("category") as string;

      // Handle null/undefined categories
      const categoryToCheck = rowCategory || "Uncategorized";

      // Return true if the row's category is in the selected filter categories
      return selectedCategories.includes(categoryToCheck);
    },
    enableGlobalFilter: true,
  });

  // Trigger filtering when filterCategories changes
  useEffect(() => {
    table.setGlobalFilter(filterCategories);
  }, [filterCategories, table]);

  return (
    <div>
      <div className="my-2">
        {/* <ClipSearch
          table={table}
          filterClips={filterClips}
          setFilterClips={setFilterClips}
        /> */}
        <DataTableToolbar table={table} />
        <CategoryFilter
          filterCategories={filterCategories}
          setFilterCategories={setFilterCategories}
        />
      </div>
      <div className="space-y-2 rounded-md border overflow-hidden dark:border-gray-700">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        table={table}
        setPagination={setPagination}
        setPageSize={setPageSize}
      />
    </div>
  );
}

// interface ClipSearchProps {
//   filterClips: string | undefined;
//   setFilterClips: (val: string) => void;
//   table: Table<TData>;
// }

// function ClipSearch<TData>(props: ClipSearchProps) {
//   const { filterClips, setFilterClips, table } = props;
//   const isFiltered = table.getState().columnFilters.length > 0;

//   return (
//     <div className="flex flex-row items-center gap-2">
//       <div className="flex flex-1 items-center space-x-2">
//         <Input
//           placeholder="Filter jobs..."
//           value={(table.getColumn("clip")?.getFilterValue() as string) ?? ""}
//           onChange={(event) =>
//             table.getColumn("name")?.setFilterValue(event.target.value)
//           }
//           className="h-8 w-[150px] lg:w-[250px]"
//         />
//         {isFiltered && (
//           <Button
//             variant="ghost"
//             onClick={() => table.resetColumnFilters()}
//             className="h-8 px-2 lg:px-3"
//           >
//             Reset
//             <Cross2Icon className="ml-2 h-4 w-4" />
//           </Button>
//         )}
//       </div>
//     </div>
//   );
// }

interface CategoryFilterProps {
  filterCategories: string[];
  setFilterCategories: (val: string[] | ((val: string[]) => string[])) => void;
}

function CategoryFilter(props: CategoryFilterProps) {
  const { filterCategories, setFilterCategories } = props;

  return (
    <div className="flex flex-row items-center gap-2">
      {categories.map((c) => (
        <Button
          key={c}
          className={`border border-gray-400 rounded cursor-pointer text-xs shadow-none ${
            filterCategories.includes(c)
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-white text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => {
            setFilterCategories((prev: string[]) =>
              prev.includes(c) ? prev.filter((cat) => cat !== c) : [...prev, c]
            );
          }}
        >
          {c}
        </Button>
      ))}
      {filterCategories.length > 0 && (
        <Button
          className="border border-red-400 rounded cursor-pointer text-xs bg-red-50 text-red-600 shadow-none hover:bg-red-100"
          onClick={() => setFilterCategories([])}
        >
          Clear All
        </Button>
      )}
    </div>
  );
}
