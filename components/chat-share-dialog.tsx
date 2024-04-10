'use client'

import * as React from 'react'
import { type DialogProps } from '@radix-ui/react-dialog'
import { toast } from 'sonner'

import { ServerActionResult, type Chat } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { IconSpinner } from '@/components/ui/icons'
import { useCopyToClipboard } from '@/lib/hooks/use-copy-to-clipboard'
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from 'next/navigation'

interface ChatShareDialogProps extends DialogProps {
  chat: Pick<Chat, 'id' | 'title' | 'messages'>
  shareChat: (id: string) => ServerActionResult<Chat>
  onCopy: () => void
}
interface ChatRenameDialogProps extends DialogProps {
  chat: Pick<Chat, 'id' | 'title' | 'messages'>
  renameChat: (id: string, name: string) => ServerActionResult<Chat>
  onCopy: () => void
}

export function ChatShareDialog({
  chat,
  shareChat,
  onCopy,
  ...props
}: ChatShareDialogProps) {
  const { copyToClipboard } = useCopyToClipboard({ timeout: 1000 })
  const [isSharePending, startShareTransition] = React.useTransition()

  const copyShareLink = React.useCallback(
    async (chat: Chat) => {
      if (!chat.path) {
        return toast.error('Could not copy share link to clipboard')
      }
      const url = new URL(window.location.href)
      url.pathname = chat.path
      console.log(copyToClipboard(url.toString()))
      onCopy()
      toast.success('Share link copied to clipboard')
    },
    [copyToClipboard, onCopy]
  )

  return (
    <Dialog {...props}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share link to chat</DialogTitle>
          <DialogDescription>
            Anyone with the URL will be able to view the shared chat.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 space-y-1 text-sm border rounded-md">
          <div className="font-medium">{chat.title}</div>
          <div className="text-muted-foreground">
            {chat.messages.length} messages
          </div>
        </div>
        <DialogFooter className="items-center">
          <Button
            disabled={isSharePending}
            onClick={() => {
              // @ts-ignore
              startShareTransition(async () => {
                const result = await shareChat(chat.id, )
                copyShareLink(result as Chat)
              })
            }}
          >
            {isSharePending ? (
              <>
                <IconSpinner className="mr-2 animate-spin" />
                Copying...
              </>
            ) : (
              <>Copy link</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


export function ChatRenameDialog({
  chat,
  renameChat,
  onCopy,
  ...props
}: ChatRenameDialogProps) {
  const { copyToClipboard } = useCopyToClipboard({ timeout: 1000 })
  const [isSharePending, startShareTransition] = React.useTransition()
  const [newChatName, setNewChatName] = React.useState('')
  const router = useRouter()

  const RenameChat = React.useCallback(
    async (chat: Chat) => {
      if (!chat.title) {
        return toast.error('Could not rename chat')
      }
      const url = new URL(window.location.href)
      url.pathname = chat.path
      onCopy()
      toast.success('Chat Renamed Successfully.')
      router.refresh()
    },
    [copyToClipboard, onCopy]
  )
  
  return (
    <Dialog {...props}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Chat</DialogTitle>
          <DialogDescription>
            Try to use a brief and concise name for later reference.
          </DialogDescription>
        </DialogHeader>
        <Textarea placeholder="Type here." onChange={e => setNewChatName(e.target.value.slice(0,100))}/>
        <DialogFooter className="items-center">
          <Button
            disabled={isSharePending}
            onClick={() => {
              // @ts-ignore
              startShareTransition(async () => {
                const result = await renameChat(chat.id, newChatName)
                RenameChat(result as Chat)
              })
            }}
          >
            {isSharePending ? (
              <>
                <IconSpinner className="mr-2 animate-spin" />
                Renaming...
              </>
            ) : (
              <>Rename Chat</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}