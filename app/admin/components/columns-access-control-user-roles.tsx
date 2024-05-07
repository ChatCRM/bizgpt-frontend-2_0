//@ts-nocheck
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Task } from "../data/schema"
import { DataTableColumnHeader } from "./data-table-column-header"


import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { Button } from "@/components/ui/button"

const DropDownSelector = ({ user_email }) => {
  return (
    <>
      <Select onValueChange={(event) => { fetch('/api/admin/access-control/update-user-role', { method: 'POST', body: JSON.stringify({ email: user_email, role: event }) }) }}  >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Change Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel >Roles</SelectLabel>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </>
  )
}

const DeleteUser = (event) => {
  fetch('/api/admin/access-control/delete-user', { method: 'POST', body: JSON.stringify({ email: event.currentTarget.value })});
}

// export const columns: ColumnDef<Task>[] = [
//   {
//     accessorKey: "id",
//     header: ({ column }) => (
//       <DataTableColumnHeader column={column} title="id" />
//     ),
//     cell: ({ row }) => <div className="w-[80px]">{row.getValue("id")}</div>,
//     enableSorting: true,
//     enableHiding: false,
//   },
//   {
//     accessorKey: "email",
//     header: ({ column }) => (
//       <DataTableColumnHeader column={column} title="Email" />
//     ),
//     cell: ({ row }) => {
//       return (
//         <div className="flex space-x-2">
//           <span className="max-w-[500px] font-medium">
//             {row.getValue("email")}
//           </span>
//         </div>
//       )
//     },
//     enableSorting: false,
//     enableHiding: false,
//   },
//   {
//     accessorKey: "role",
//     header: ({ column }) => (
//       <DataTableColumnHeader column={column} title="Role" />
//     ),
//     cell: ({ row }) => {
//       return (
//         <div className="flex space-x-2">
//           <span className="max-w-[500px] font-medium">
//             {row.getValue("role")}
//           </span>
//         </div>
//       )
//     },
//     enableSorting: false,
//     enableHiding: true,
//   },
//   {
//     id: "actions",
//     header: "Change Role",
//     enableHiding: false,
//     cell: ({ row }) => {
//       return (
//         <>
//           <div>
//             {!row.original.isUser ? <DropDownSelector user_email={row.original.email} /> : undefined}
//           </div>
//         </>)
//     },
//   },
//   {
//     id: "delete",
//     header: "Delete",
//     enableHiding: false,
//     cell: ({ row }) => {
//       return (
//         <>
//           <div>
//             {!row.original.isUser ? <><Button value={row.original.email} className="bg-red-600" onClick={DeleteUser}><PersonRemoveIcon /> </Button> </> : undefined}
//           </div>
//         </>)
//     },
//   }
// ]
