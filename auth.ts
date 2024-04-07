import 'server-only'

import { createClient } from '@/utils/supabase/server'

export const auth = async () => {
  const supabase = createClient()
  await supabase.auth.getUser()
  const { data:data, error:error } = await supabase.auth.getSession()
  return data.session
}

export const authUser = async () => {
  const supabase = createClient()
  const { data:data, error:error } = await supabase.auth.getUser()
  return data
}