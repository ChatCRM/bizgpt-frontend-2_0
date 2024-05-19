//@ts-nocheck
import 'server-only'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { PostgrestError } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { getUserIdByEmail } from '@/app/admin/actions'


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
  const user_auth = await supabase.auth.admin.getUserById()
  const { data, error } = await supabase
    .from('user_bizgpt_role')
    .update({ role: json.role })
    .eq('user', await getUserIdByEmail(json.email))
    .select()
  return NextResponse.json({ status: 200 })
}
