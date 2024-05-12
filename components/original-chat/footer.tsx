import React from 'react'

import { cn } from '@/lib/utils'
import GlobalConfig from '@/app/app.config.js'

const TextDirection = process.env.NEXT_PUBLIC_TEXT_DIRECTION

const FooterClientText = process.env.NEXT_PUBLIC_FOOTER_CLIENT_TEXT ? process.env.NEXT_PUBLIC_FOOTER_CLIENT_TEXT : 'BizGPT'
const UseFooterClientText = process.env.NEXT_PUBLIC_USE_FOOTER_CLIENT_TEXT ? ['true', '1', 't'].includes(process.env.NEXT_PUBLIC_USE_FOOTER_CLIENT_TEXT.toLowerCase()) : true


export function FooterText({ className, ...props }: React.ComponentProps<'p'>) {

  return (
    <p
      dir={TextDirection}
      className={cn(
        'px-2 text-center text-xs leading-normal text-muted-foreground',
        className
      )}
      {...props}
    >
      {UseFooterClientText ? FooterClientText : undefined}
      
    </p>
  )
}
