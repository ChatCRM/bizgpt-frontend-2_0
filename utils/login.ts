import { createClient } from '@/utils/supabase/client'


const supabase = createClient()

type formStateType = {
    email: string,
    password: string
}

export const signInServer = async (formState: formStateType) => {
    const { email, password } = formState
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return error
  }

export const signUpServer = async (formState: formStateType) => {
    const { email, password } = formState
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/api/auth/callback` }
    })
}

export async function logout() {
  const supabase = createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs


  const { error } = await supabase.auth.signOut()
  if (error) {
    return error
  }
  else {
    return null
  }
}