"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter Clips..."
          value={(table.getColumn("clip")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("clip")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}

// interface CategoryFilterProps {
//   filterCategories: string[];
//   setFilterCategories: (val: string[] | ((val: string[]) => string[])) => void;
// }

// function CategoryFilter(props: CategoryFilterProps) {
//   const { filterCategories, setFilterCategories } = props;

//   return (
//     <div className="flex flex-row items-center gap-2">
//       {categories.map((c) => (
//         <Button
//           key={c}
//           className={`border border-gray-400 rounded cursor-pointer text-xs shadow-none ${
//             filterCategories.includes(c)
//               ? "bg-blue-500 text-white hover:bg-blue-600"
//               : "bg-white text-gray-700 hover:bg-gray-200"
//           }`}
//           onClick={() => {
//             setFilterCategories((prev: string[]) =>
//               prev.includes(c) ? prev.filter((cat) => cat !== c) : [...prev, c]
//             );
//           }}
//         >
//           {c}
//         </Button>
//       ))}
//       {filterCategories.length > 0 && (
//         <Button
//           className="border border-red-400 rounded cursor-pointer text-xs bg-red-50 text-red-600 shadow-none hover:bg-red-100"
//           onClick={() => setFilterCategories([])}
//         >
//           Clear All
//         </Button>
//       )}
//     </div>
//   );
// }
