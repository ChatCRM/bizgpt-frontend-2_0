// @ts-nocheck
import { type UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { PromptForm } from '@/components/original-chat/prompt-form'
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom'
import { IconRefresh, IconStop } from '@/components/ui/icons'
import { FooterText } from '@/components/original-chat/footer'

export interface ChatPanelProps
  extends Pick<
    UseChatHelpers,
    | 'append'
    | 'isLoading'
    | 'reload'
    | 'messages'
    | 'stop'
    | 'input'
    | 'setInput'
  > {
  id?: string
  isAtBottom: boolean
  scrollToBottom: () => void
}

export function ChatPanel({
  id,
  isLoading,
  stop,
  append,
  reload,
  input,
  setInput,
  messages,
  isAtBottom,
  scrollToBottom
}: ChatPanelProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 w-11/12 peer-[[data-state=closed]]:group-[]:lg:pl-[100px] peer-[[data-state=closed]]:group-[]:xl:pl-[150px] bg-gradient-to-b from-muted/30 from-0% to-muted/30 to-50% duration-300 ease-in-out animate-in dark:from-background/10 dark:from-10% dark:to-background/80 peer-[[data-state=open]]:group-[]:lg:pl-[300px] peer-[[data-state=open]]:group-[]:xl:pl-[370px]">
      <ButtonScrollToBottom
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />
      <div className="mx-auto sm:max-w-2xl sm:px-4">
        <div className="mb-4 grid grid-cols-3 gap-2 px-4 sm:px-0 ">
          <div> </div>
          <div>
          {isLoading ? (
            <Button
              variant="outline"
              onClick={() => stop()}
              className="bg-background"
            >
              <IconStop className="mr-2" />
              Stop generating
            </Button>
          ) : (
            messages?.length > 0 

           // Request: Disabled the Rengenerate Last Response feature 
            // && (
            //   <Button
            //     variant="outline"
            //     onClick={() => reload()}
            //     className="bg-background"
            //   >
            //     <IconRefresh className="mr-2" />
            //     Regenerate last response
            //   </Button>
            // )
          )}
          </div>
        </div>
        <div className="space-y-1 border-t bg-background px-2 py-2 shadow-lg sm:rounded-t-xl sm:border md:py-4">
          <PromptForm
            onSubmit={async value => {
              await append({
                id,
                content: value,
                role: 'user'
              })
            }}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
          />
          <FooterText className="hidden sm:block" />
        </div>
      </div>
    </div>
  )
}
