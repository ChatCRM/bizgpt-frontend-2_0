"use client"

import { Cross2Icon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "@/app/admin/components/data-table-view-options"

import { priorities, statuses } from "@/app/admin/data/data"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"

import GlobalConfig from '@/app/app.config.js'

const TextDirection = process.env.TEXT_DIRECTION

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  // Language and Translation
  var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`);

  return (
    <div className="flex items-center justify-between space-x-2">
      <div className={TextDirection == "RTL" ? "flex flex-1 items-center space-x-2"  : "flex flex-1 items-center space-x-2"} dir={TextDirection}>
        <Input
          placeholder={TranslationData["Filter documents..."]}
          value={(table.getColumn("content")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("content")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Input
          placeholder={TranslationData["Filter sources..."]}
          value={(table.getColumn("metadata")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("metadata")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
      </div>
      {/* {TextDirection == 'RTL' ? undefined : <DataTableViewOptions table={table} />} */}
      <DataTableViewOptions table={table} />
    </div>
  )
}
