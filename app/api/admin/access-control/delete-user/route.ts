//@ts-nocheck
import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdByEmail, getOrganizationId } from '@/app/admin/actions'


export const runtime = 'edge'

export async function POST(req: Request) {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: { schema: process.env.BIZGPT_ORGANIZATION } 
    }
  )

  const json = await req.json()

  // Delete the user from Supabase
  const user = await getUserIdByEmail(json.email)
  const { data, error } = await supabase.auth.admin.deleteUser(
    user
  )
  if (!error)
    return NextResponse.json({ status: 200 })
  else
  return NextResponse.json({ status: 500 })
}
