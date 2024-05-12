//@ts-nocheck
import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GlobalConfig from '@/app/app.config.js'

const TextDirection = process.env.NEXT_PUBLIC_TEXT_DIRECTION
// const clientFooterName = process.env.NEXT_PUBLIC_CLIENT_BRANDING_NAME ? process.env.NEXT_PUBLIC_CLIENT_BRANDING_NAME : 'BizGPT' 
// const FooterClientText = process.env.NEXT_PUBLIC_FOOTER_CLIENT_TEXT ? process.env.NEXT_PUBLIC_FOOTER_CLIENT_TEXT : 'BizGPT' 

const EmptyTextHeader = process.env.NEXT_PUBLIC_EMPTY_TEXT_HEADER ? process.env.NEXT_PUBLIC_EMPTY_TEXT_HEADER : 'Welcome to BizGPT' 
const EmptyTextBody = process.env.NEXT_PUBLIC_EMPTY_TEXT_BODY ? process.env.NEXT_PUBLIC_EMPTY_TEXT_BODY : 'You can start a conversation by asking something or try the following examples:' 
const UseExampleMessages = process.env.NEXT_PUBLIC_USE_EXAMPLE_MESSAGES ? ['true', '1', 't'].includes(process.env.NEXT_PUBLIC_USE_EXAMPLE_MESSAGES.toLowerCase()) : true

export function EmptyScreen({ setInput }: Pick<UseChatHelpers, 'setInput'>) {
  
  // Language and Translation
  var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`);

  const exampleMessages = [
    {
      heading: TranslationData['Describe your business'],
      message: TranslationData["What is 'X'?"]
    },
    {
      heading: TranslationData["Introduce yourself"],
      message: TranslationData["Hi\nMy name is 'Mr. X'"]
    }
  ]

  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-2 text-lg font-semibold" dir={TextDirection}>
          {`${EmptyTextHeader}`}
        </h1>
        <p className="leading-normal text-muted-foreground" dir={TextDirection}>
          
          {`${EmptyTextBody}`}
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2" dir={TextDirection}>
          {UseExampleMessages ? exampleMessages.map((message, index) => (
            <Button
              key={index}
              dir={TextDirection}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={() => setInput(message?.message)}
            >
              {TextDirection == 'RTL'? <ArrowBackIcon className="mr-2 text-muted-foreground" direction={TextDirection}/> : <IconArrowRight className="mr-2 text-muted-foreground" />}
              {message?.heading}
            </Button>
          )) : undefined}
        </div>
      </div>
    </div>
  )
}
