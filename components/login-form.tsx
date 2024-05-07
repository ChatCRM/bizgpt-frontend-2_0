//@ts-nocheck
'use client'

import * as React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

import { Button } from '@/components/ui/button'
import { IconSpinner } from '@/components/ui/icons'
import { Input } from './ui/input'
import { Label } from './ui/label'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

import GlobalConfig from '@/app/app.config.js'
import { createBrowserClient } from '@/utils/supabase/client'

import {signInServer} from '@/utils/login'


interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  action: 'sign-in' | 'sign-up'
}

export function LoginForm({
  className,
  action = 'sign-in',
  ...props
}: LoginFormProps) {
  const TextDirection = process.env.NEXT_PUBLIC_TEXT_DIRECTION
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()
  // Create a Supabase client configured to use cookies


  const [formState, setFormState] = React.useState<{
    email: string
    password: string
  }>({
    email: '',
    password: ''
  })

  const signIn = async () => {
    // const { email, password } = formState
    // const { error } = await supabase.auth.signInWithPassword({
    //   email,
    //   password
    // })
    // return error
    const error = await signInServer(formState)
    return error
  }

  // const signUp = async () => {
  //   const { email, password } = formState
  //   const { error, data } = await supabase.auth.signUp({
  //     email,
  //     password,
  //     options: { emailRedirectTo: `${location.origin}/api/auth/callback` }
  //   })

  //   if (!error && !data.session)
  //     toast.success('Check your inbox to confirm your email address!')
  //   return error
  // }

  const handleOnSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault()
    setIsLoading(true)

    const error = action === 'sign-in' ? await signIn() : await signUp()

    if (error) {
      setIsLoading(false)
      toast.error(error.message)
      return
    }

    setIsLoading(false)
    router.refresh()
  }

  // Language and Translation
  var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`);

  return (
    <div {...props}>
      <form onSubmit={handleOnSubmit}>
        <fieldset className="flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-1" dir={TextDirection}>
          <Label>{TranslationData["Email"]}</Label>

            <Input
              name="email"
              dir="LTR"
              type="email"
              value={formState.email}
              onChange={e =>
                setFormState(prev => ({
                  ...prev,
                  email: e.target.value
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-y-1" dir={TextDirection}>
          <Label>{TranslationData["Password"]}</Label>
            <Input
              name="password"
              dir="LTR"
              type="password"
              value={formState.password}
              onChange={e =>
                setFormState(prev => ({
                  ...prev,
                  password: e.target.value
                }))
              }
            />
          </div>
        </fieldset>

        <div className="mt-4 flex items-center">
          <Button disabled={isLoading}>
            {isLoading && <IconSpinner className="mr-2 animate-spin" />}
            {action === 'sign-in' && TranslationData["Sign In"]}
          </Button>
          {/* <p className="ml-4">
            {action === 'sign-in' ? (
              <>
                Don&apos;t have an account?{' '}
                <Link href="/sign-up" className="font-medium">
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link href="/sign-in" className="font-medium">
                  Sign In
                </Link>
              </>
            )}
          </p> */}
          <p className="ml-4">
            {TranslationData["Forgot Password?"]}{' '}
            <Link href="/reset-password" className="font-medium">
              <strong> {TranslationData["Reset Password"]} </strong>
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}
