import * as React from 'react'
import Link from 'next/link'
import Textarea from 'react-textarea-autosize'
import { UseChatHelpers } from 'ai/react'

import { useEnterSubmit } from '@/lib/hooks/use-enter-submit'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { IconArrowElbow, IconPlus } from '@/components/ui/icons'

import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

import GlobalConfig from '@/app/app.config.js'

const TextDirection = process.env.TEXT_DIRECTION

export interface PromptProps
  extends Pick<UseChatHelpers, 'input' | 'setInput'> {
  onSubmit: (value: string) => Promise<void>
  isLoading: boolean
}

export function PromptForm({
  onSubmit,
  input,
  setInput,
  isLoading
}: PromptProps) {
  const { formRef, onKeyDown } = useEnterSubmit()
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Language and Translation
  // var TranslationData = require(`@/translation/${process.env.BIZGPT_FRONTEND_LANGUAGE}.json`);
  var TranslationData = require(`@/translation/EN.json`);

  return (
    <form
      onSubmit={async e => {
        e.preventDefault()
        if (!input?.trim()) {
          return
        }
        setInput('')
        await onSubmit(input)
      }}
      ref={formRef}
    >
      <div className="relative flex max-h-60 w-full grow flex-col overflow-hidden bg-background px-16 sm:rounded-md sm:border sm:px-12">
        {/* <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className={cn(
                buttonVariants({ size: 'sm', variant: 'outline' }),
                'absolute left-0 top-4 h-8 w-8 rounded-full bg-background p-0 sm:left-4'
              )}
            >
              <IconPlus />
              <span className="sr-only">New Chat</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip> */}
        <Textarea
          ref={inputRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          dir={TextDirection}
          placeholder={TranslationData["Ask Something..."]}
          spellCheck={false}
          className={TextDirection == "RTL" ? "min-h-[60px] w-full resize-none bg-transparent py-[1.3rem] pr-[20px] focus-within:outline-none sm:text-sm" : "min-h-[60px] w-full resize-none bg-transparent py-[1.3rem] focus-within:outline-none sm:text-sm"}
        />
        <div className="absolute right-0 top-4 sm:right-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || input === ''}
              >
                <ArrowForwardIosIcon />
                <span className="sr-only">{TranslationData["Send message"]}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{TranslationData["Send message"]}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </form>
  )
}
