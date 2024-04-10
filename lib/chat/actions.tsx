import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  render,
  createStreamableValue
} from 'ai/rsc'
import OpenAI from 'openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat } from '@/lib/types'
import { authUser } from '@/auth'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})


async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const ui = render({
    model: 'gpt-3.5-turbo',
    provider: openai,
    initial: <SpinnerMessage />,
    messages: [
      {
        role: 'system',
        content: `\
You are a stock trading conversation bot and you can help users buy stocks, step by step.
You and the user can discuss stock prices and the user can adjust the amount of stocks they want to buy, or place an order, in the UI.

Messages inside [] means that it's a UI element or a user event. For example:
- "[Price of AAPL = 100]" means that an interface of the stock price of AAPL is shown to the user.
- "[User has changed the amount of AAPL to 10]" means that the user has changed the amount of AAPL to 10 in the UI.

If the user requests purchasing a stock, call \`show_stock_purchase_ui\` to show the purchase UI.
If the user just wants the price, call \`show_stock_price\` to show the price.
If you want to show trending stocks, call \`list_stocks\`.
If you want to show events, call \`get_events\`.
If the user wants to sell stock, or complete another impossible task, respond that you are a demo and cannot do that.

Besides that, you can also chat with users and do some calculations if needed.`
      },
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    }
  })

  return {
    id: nanoid(),
    display: ui
  }
}

export type Message = {
  role: 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool'
  content: string
  id: string
  name?: string
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  unstable_onGetUIState: async () => {
    'use server'

    const session = await authUser()

    if (session && session.user) {
      const aiState = getAIState()

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  unstable_onSetAIState: async ({ state, done }) => {
    'use server'

    const session = await authUser()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`
      const title = messages[0].content.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'function' ? (
          message.name === 'listStocks' ? (
            <BotCard>
              <Stocks props={JSON.parse(message.content)} />
            </BotCard>
          ) : message.name === 'showStockPrice' ? (
            <BotCard>
              <Stock props={JSON.parse(message.content)} />
            </BotCard>
          ) : message.name === 'showStockPurchase' ? (
            <BotCard>
              <Purchase props={JSON.parse(message.content)} />
            </BotCard>
          ) : message.name === 'getEvents' ? (
            <BotCard>
              <Events props={JSON.parse(message.content)} />
            </BotCard>
          ) : null
        ) : message.role === 'user' ? (
          <UserMessage>{message.content}</UserMessage>
        ) : (
          <BotMessage content={message.content} />
        )
    }))
}
