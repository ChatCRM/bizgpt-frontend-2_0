//@ts-nocheck
'use client'
import { columns } from '@/app/admin/components/columns-access-control-user-roles'
import { DataTable } from '@/app/admin/components/data-table-access-control-user-roles'
import useSWR from 'swr'
import { AddUser } from '@/app/admin/access-control/add-user'
import { pink } from '@mui/material/colors'
// ss
import { ColumnDef } from '@tanstack/react-table'
import { Task } from '@/app/admin/components/data/schema'
import { DataTableColumnHeader } from '@/app/admin/components/data-table-column-header'

import PersonRemoveSharpIcon from '@mui/icons-material/PersonRemoveSharp'
import { Button } from '@/components/ui/button'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useState, useEffect } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Truculenta } from 'next/font/google'

import GlobalConfig from '@/app/app.config.js'

const TextDirection = process.env.TEXT_DIRECTION

export function FeedbacksAdmin() {

  // Language and Translation
  var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`);

  const [disabled, setDisabled] = useState(false)
  const { toast } = useToast()
  const fetcher = url =>
    fetch(url, { cache: 'no-store' }).then(res => res.json())
  const { data, error, isLoading, mutate } = useSWR(
    '/api/admin/feedbacks/get-feedback-details-table',
    fetcher
  )
  if (isLoading) return <p dir={TextDirection}>{TranslationData["Loading..."]}</p>
  if (!data) return <p dir={TextDirection}>{TranslationData["No data!"]}</p>


  const columns: ColumnDef<Task>[] = [
    {
      accessorKey: 'id',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={TranslationData["id"]} />
      ),
      cell: ({ row }) => <div className="w-[80px]">{row.getValue('id')}</div>,
      enableSorting: true,
      enableHiding: false
    },
    {
      accessorKey: 'Email'.toLocaleLowerCase(),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={TranslationData['Email']} />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex space-x-2">
            <span className="max-w-[500px] font-medium">
              {row.getValue('email')}
            </span>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: false
    },
    {
      accessorKey: 'question',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={TranslationData["question"]} />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex space-x-2">
            <span className="max-w-[500px] font-medium">
              {row.getValue('question')}
            </span>
          </div>
        )
      },
      enableSorting: false,
      enableHiding: true
    },
    {
      accessorKey: 'ai_response',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={TranslationData["ai_response"]} />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex space-x-2">
            <span className="max-w-[500px] font-medium">
              {row.getValue('ai_response')}
            </span>
          </div>
        )
      },
      enableSorting: false,
      enableHiding: true
    },
    {
      accessorKey: 'feedback_text',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={TranslationData["feedback_text"]} />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex space-x-2">
            <span className="max-w-[500px] font-medium">
              {row.getValue('feedback_text')}
            </span>
          </div>
        )
      },
      enableSorting: false,
      enableHiding: true
    },
    {
      accessorKey: 'feedback_rating',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={TranslationData["feedback_rating"]} />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex space-x-2">
            <span className="max-w-[500px] font-medium">
              {row.getValue('feedback_rating')}
            </span>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: false
    },
    {
      accessorKey: 'datetime_added',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={TranslationData["datetime_added"]} />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex space-x-2">
            <span className="max-w-[500px] font-medium">
              {row.getValue('datetime_added')}
            </span>
          </div>
        )
      },
      enableSorting: true,
      enableHiding: true
    },
  ]

  return (
    <>
      <div className="hidden h-full flex-1 flex-col space-y-8 pl-8 pr-8 pb-8 md:flex">
        <DataTable data={data} columns={columns} />
      </div>
    </>
  )
}
