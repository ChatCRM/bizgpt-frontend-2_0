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
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import GlobalConfig from '@/app/app.config.js'

interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  action: 'reset-password-init' | 'reset-password-callback'
}

export function ResetPasswordForm({
  className,
  action,
  ...props
}: LoginFormProps) {
  const searchParams = useSearchParams()
  const callbackValue = searchParams.get('callback')
  const emailValue = searchParams.get('email')
  const TextDirection = process.env.TEXT_DIRECTION
  const [isLoading, setIsLoading] = React.useState(false)
  const [isBackDisabled, setIsBackDisabled] = React.useState(true)
  const router = useRouter()
  // Create a Supabase client configured to use cookies
  const supabase = createClientComponentClient()

  const [formState, setFormState] = React.useState<{
    email: string
    password: string
    disabled: boolean
  }>({
    email: '',
    password: '',
    disabled: false
  })

  useEffect(() => {
    if (emailValue) {
      setFormState(prev => ({
        ...prev,
        email: emailValue,
        disabled: true
      }))
    }
  }, [formState])

  const ResetPasswordInit = async () => {
    const { email, password } = formState
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password?callback=true&email=${email}`
    })
    if (!error) toast.success(TranslationData['Check your inbox!'])
    return error
  }

  const ResetPassword = async () => {
    const { email, password } = formState
    const { data, error } = await supabase.auth.updateUser({
      password: password
    })
    if (!error) {
      toast.success(
        TranslationData[
          'Password reset successfully. You could go back using the button.'
        ]
      )
    }
    return error
  }

  const handleOnSubmit: React.FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault()
    setIsBackDisabled(false)
    setIsLoading(true)

    const error = callbackValue
      ? await ResetPassword()
      : await ResetPasswordInit()

    if (error) {
      setIsLoading(false)
      setIsBackDisabled(true)
      toast.error(error.message)
      return
    }
    setIsLoading(false)
    // router.replace('/')
  }

  // Language and Translation
  var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`)

  return (
    <div {...props}>
      <form onSubmit={handleOnSubmit}>
        <fieldset className="flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-1" dir={TextDirection}>
            <Label>{TranslationData['Email']}</Label>

            <Input
              name="email"
              dir="LTR"
              type="email"
              value={formState.email}
              disabled={formState.disabled}
              onChange={e =>
                setFormState(prev => ({
                  ...prev,
                  email: e.target.value
                }))
              }
            />
          </div>
          {emailValue ? (
            <div className="flex flex-col gap-y-1" dir={TextDirection}>
              <Label>{TranslationData['New Password']}</Label>
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
          ) : undefined}
        </fieldset>

        <div
          className="mt-4 gap-3 flex items-start justify-items-end"
          dir={TextDirection}
        >
          {TextDirection === 'RTL' ? (
            <>
              <Button disabled={isBackDisabled} variant="outline">
                <a href={location.origin}>{TranslationData['Go Back']}</a>
              </Button>
              <Button disabled={isLoading || !isBackDisabled}>
                {isLoading && <IconSpinner className="mr-2 animate-spin" />}
                {action === 'reset-password-init' &&
                  TranslationData['Reset Password']}
              </Button>
            </>
          ) : (
            <>
              <Button disabled={isLoading || !isBackDisabled}>
                {isLoading && <IconSpinner className="mr-2 animate-spin" />}
                {action === 'reset-password-init' &&
                  TranslationData['Reset Password']}
              </Button>

              <Button disabled={isBackDisabled} variant="outline">
                <a href={location.origin}>{TranslationData['Go Back']}</a>
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}
