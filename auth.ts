import 'server-only'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export const auth = async () => {
  const supabase = createClient()
  await supabase.auth.getUser()
  const { data:data, error:error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}
