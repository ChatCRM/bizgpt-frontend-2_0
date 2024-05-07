//@ts-nocheck
import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GlobalConfig from '@/app/app.config.js'

const TextDirection = process.env.NEXT_PUBLIC_TEXT_DIRECTION
const clientFooterName = process.env.NEXT_PUBLIC_CLIENT_BRANDING_NAME ? process.env.NEXT_PUBLIC_CLIENT_BRANDING_NAME : 'BizGPT' 

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
          { `${TranslationData["Welcome to"]} ${clientFooterName}` }
        </h1>
        <p className="leading-normal text-muted-foreground" dir={TextDirection}>
          
          {TranslationData["You can start a conversation by asking something or try the following examples:"] }
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2" dir={TextDirection}>
          {exampleMessages.map((message, index) => (
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
          ))}
        </div>
      </div>
    </div>
  )
}
