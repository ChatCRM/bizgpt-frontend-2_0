// "use client"

// import { ColumnDef } from "@tanstack/react-table"

// import { Badge } from "@/components/ui/badge"
// import { Checkbox } from "@/components/ui/checkbox"

// import { labels, priorities, statuses } from "@/app/admin/data/data"
// import { Task } from "../data/schema"
// import { DataTableColumnHeader } from "./data-table-column-header"
// import { DataTableRowActions } from "./data-table-row-actions"

// import GlobalConfig from '@/app/app.config.js'

// const TextDirection = process.env.TEXT_DIRECTION

// // Language and Translation
// var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`);
// console.log(GlobalConfig.LANG)
// export const columns: ColumnDef<Task>[] = [
//   {
//     accessorKey: "id",
//     header: ({ column }) => (
//       <DataTableColumnHeader column={column} title={TranslationData["id"]} />
//     ),
//     cell: ({ row }) => <div className="w-[80px]">{row.getValue("id")}</div>,
//     enableSorting: true,
//     enableHiding: false,
//   },
//   {
//     accessorKey: "content",
//     header: ({ column }) => (
//       <DataTableColumnHeader column={column} title={TranslationData["Document Chunk"]} />
//     ),
//     cell: ({ row }) => {
//       return (
//         <div className="flex space-x-2">
//           <span className="max-w-[500px] font-medium">
//             {row.getValue("content")}
//           </span>
//         </div>
//       )
//     },
//     enableSorting: false,
//     enableHiding: false,
//   },
//   {
//     accessorKey: "metadata",
//     header: ({ column }) => (
//       <DataTableColumnHeader column={column} title={TranslationData["metadata"]} />
//     ),
//     cell: ({ row }) => {
//       return (
//         <div className="flex space-x-2">
//           <span className="max-w-[500px] font-medium">
//             {row.getValue("metadata")}
//           </span>
//         </div>
//       )
//     },
//     enableSorting: true,
//     enableHiding: true,
//   },
//   {
//     accessorKey: "datetime_added",
//     header: ({ column }) => (
//       <DataTableColumnHeader column={column} title={TranslationData["datetime_added"]} />
//     ),
//     cell: ({ row }) => {

//       return (
//         <div className="flex space-x-2">
//           <span className="max-w-[500px] font-medium">
//             {row.getValue("datetime_added")}
//           </span>
//         </div>
//       )
//     },
//     enableSorting: true,
//     enableHiding: true,
//   }
// ]
