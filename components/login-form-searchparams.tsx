'use client'

import * as React from 'react'
import { createClient } from "@/utils/supabase/client";
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'


interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  user_id: string | string[] | undefined,
}

export function LoginFormSearchParams({
  className,
  user_id,
  ...props
}: LoginFormProps) {
  const [Session, setSession] = useState(0)
  const router = useRouter()
  const supabase = createClient();
  // old: maxAge 900000
  const BizGPTOrganization = process.env.NEXT_PUBLIC_BIZGPT_ORGANIZATION
  const email = `user_${user_id}@${BizGPTOrganization}.com`
  const password = process.env.NEXT_PUBLIC_BIZGPT_ORGANIZATION_PASSWORD

  const signInSignUp = async (email : string, password: string) => {

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })
    
    if(error){
      const { data,error } = await supabase.auth.signUp({
        email,
        password
      })
      return data
    }
    return data  
  }

  useEffect(() => {
    if (email && password && typeof window !== "undefined"){
      signInSignUp(email, password).then( (res) => {
        setSession(1);
        router.refresh();
      })}
  }, [Session]);


  return null
}
