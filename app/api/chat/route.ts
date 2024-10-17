// @ts-nocheck

import 'server-only'

import { assistantId } from '@/app/assistant-config'
import { openai } from '@/app/openai'

import { OpenAIStream, StreamingTextResponse } from 'ai'
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClientSchema } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Database } from '@/lib/db_types'

import { auth, authUser } from '@/auth'
import { nanoid, generateUUID } from '@/lib/utils'
import { threadId } from 'worker_threads'

export const maxDuration = 120
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const cookieStore = cookies()
  const supabase = createClientSchema()
  const json = await req.json()
  const { messages, previewToken } = json
  const userId = json.user_id
  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  if (previewToken) {
    configuration.apiKey = previewToken
  }

  const mode = process.env.PERSISTENCE_MODE
  const userName = json.username
  const url = `${process.env.BizGPT_CLIENT_API_BASE_ADDRESS_SCHEME}://${process.env.BizGPT_CLIENT_API_BASE_ADDRESS}:${process.env.BizGPT_CLIENT_API_PORT}/${process.env.BizGT_CLIENT_API_MESSAGES_SUBMIT_PATH}`
  const index = Math.round(json.messages.length / 2)
  console.log('messages are:' + JSON.stringify(messages))
  const question_text = messages.at(-1).content
  const payload = {
    username: userName,
    streamlit_element_key_id: String(index),
    question_text: question_text,
    chat_id: json.id,
    user_id: json.user_id
  }
  // const threadId = json.threadId
  // console.log(`ThreadId Is: ${threadId}`)
  console.log(`AssitatntId Is: ${assistantId}`)

  // const content = question_text
  // console.log('content is: ' + question_text)
  // await openai.beta.threads.messages.create(threadId, {
  //   role: 'user',
  //   content: question_text
  // })
  // const instructions = `
  //     You are an advanced financial analyst with expertise in accounting, auditing, and financial statement analysis. You have been provided with two files: FinancialVoucher and ProfitAndLoss. Your task is to analyze these files and answer any questions related to their content.
  //   FinancialVoucher file id is : 'file-UYweCDPEWSzjHVd0NVqNPXTp'
  //   ProfitAndLoss file id is : 'file-Tt6L4Xo91vK5Ms7tTszpeyKV'

  //   The CSV FIles have the following structures:

  //   ProfitAndLoss CSV FIle:
  //   ID (bigint)
  //   YearID (nvarchar)
  //   StatementCode (int)
  //   StatementTitle (varchar)
  //   Amount (int)

  //   FinancialVoucher CSV FIle:
  //   ID (bigint)
  //   AccountNumber (int)
  //   AccountName (varchar)
  //   AccountGroupName (varchar)
  //   VoucherDate (date)
  //   Amount (int)

  //   FinancialVoucher CSV File values are like the following:

  //   AccountName has the following unique values(pay attention ';' character is part of the values):
  //       Meeting course update and the like (ki;
  //       Reporting group life;
  //       Postage;
  //       Rental of computer systems licenses and equipment;
  //       Outbound value added tax when purchasing services from abroad low rate;
  //       Travel cost excluding VAT deduction;
  //       Accounting reconciliation reporting payroll;
  //       Accrued interest income;
  //       Gifts tax deductible;
  //       IT Group;
  //       Contingent deductible;
  //       Costs Debt collection services;
  //       Group sales income taxable;
  //       Counter account reimbursement sick pay;
  //       Preliminary project implementation;
  //       Consulting;
  //       Fixtures and equipment;
  //       Other office expenses;
  //       Income from previously written-down receivables;
  //       Reported otp;
  //       Intangible assets;
  //       Earned unbilled income;
  //       Xledger;
  //       Small procurement inventory;
  //       Market Group;
  //       Accrued costs of goods sold;
  //       Other requirements company same group;
  //       Xledger licenses;
  //       Holiday pay calculated;
  //       Depreciation of intangible assets and GW;
  //       Loss on receivables;
  //       Small procurement computer equipment;
  //       Accrual account salary Gr. 50xx;
  //       Sales revenue group tax-free;
  //       Interim bank account;
  //       Provision for losses on receivables;
  //       Deductible benefits in kind;
  //       Counter account reporting group life;
  //       Rent premises;
  //       Fees for legal assistance - deductible;
  //       Operating account 7058.06.69520;
  //       Gain on realization of shares;
  //       Employer's tax;
  //       Observation account;
  //       Currency loss (disagio);
  //       Foreign exchange gain (agio);
  //       Prepaid costs;
  //       Payable employer's tax;
  //       Annual statement and equation;
  //       Opposite account Reported otp;
  //       Bank withholding tax;
  //       Auxiliary account onward invoicing Group;
  //       Accounts receivable group companies;
  //       Tripletex;
  //       Accounts payable;
  //       Cleaning;
  //       Other cost;
  //       Other short-term receivables;
  //       Income Fee/interest Debt collection services;
  //       Accounts payable tax return VAT;
  //       Consultant's fee Group;
  //       Visma licenses;
  //       Cost of goods;
  //       Output VAT low rate;
  //       Portfolio Transactions;
  //       Unsettled customer records;
  //       Investments in subsidiaries;
  //       Client funds;
  //       Mobile phones / equipment;
  //       Accrued aga holiday pay;
  //       Warehouse rental/parking;
  //       Interest income bank;
  //       Accounting fee Group;
  //       Receivable dividend;
  //       To further fact.;
  //       Other staff costs;
  //       Salary to employees;
  //       Decr. machines fixtures etc.;
  //       System cost Group;
  //       Other foreign service;
  //       Accrual income;
  //       Other cost of sales;
  //       Light heat;
  //       Mobile phone and feature employees;
  //       Overtime;
  //       Other cost premises;
  //       PowerOffice Go;
  //       Rounding account;
  //       Accounting work/trans processing property;
  //       Allocation of overtime and overtime;
  //       Hourly wages;
  //       Visma Kickback;
  //       Reported sick pay reimbursement;
  //       Salary/sick pay without holiday pay;
  //       Gift to employees not deductible;
  //       Client account;
  //       Payroll Group;
  //       Salary distribution between departments;
  //       System revenue;
  //       Training continuing education employees;
  //       Flex;
  //       Overtime food;
  //       Accounting work free of charge;
  //       OTP;
  //       Advance deductions;
  //       Offsetting account for other 52xx;
  //       Bank and card fees;
  //       Temp agency;
  //       Dividend Mutual;
  //       Receivable Group contribution;
  //       Office supplies;
  //       Re-invoiced avg obligatory;
  //       Subletting;
  //       Fee Group;
  //       Advertising cost;
  //       Holiday pay;
  //       Property management;
  //       Debt to company s. group;
  //       Reimbursements of sick pay;
  //       Other financial income;
  //       Goods Group;
  //       Narf Quotas;
  //       Other operational rel. income deductable;
  //       Input VAT when purchasing services from abroad low rate;
  //       Visma.net;
  //       Rental of office machines and equipment;
  //       Fee audit;
  //       Accounts payable group companies;
  //       Common costs;
  //       Arb. dept. accrued holiday pay;
  //       Pull parking;
  //       Input VAT medium rate raw fish etc.;
  //       Accounts receivable;
  //       Canteen cost;
  //       Change in AVS losses on receivables;
  //       Receivables from employees;
  //       Input VAT low rate;
  //       Accrued interest;
  //       Travel costs not mandatory;
  //       Car allowance compulsory;

  //   AccountGroupName has the following unique values:
  //       LICENSE PATENT LICENSES
  //       OTHER FINANCIAL COSTS
  //       OTHER OPERATING EXPENSES
  //       PUBLIC FEES OBLIGED
  //       SUPPLIER DEBTS
  //       OTHER CLAIMS
  //       CLAIMS ON EMPLOYEES
  //       DEPRECIATION
  //       OTHER CARD DEBT
  //       OTHER SALES INCOME
  //       BANK DEPOSITS AND CASH
  //       SALES INCOME
  //       OTHER FINANCIAL INCOME
  //       LABOR COST
  //       OTHER INTEREST INCOME
  //       CUSTOMER RECEIVABLES
  //       FIXED INVENTORY
  //       COST OF GOODS
  //       RECEIVABLES
  //       INVESTMENT SUBSIDIARY

  //   VoucherDate format is like '2022-04-30'

  //   ProfitAndLoss Table values are like the following:

  //   YearID  format is like '2022'

  //   StatementCode  format is like 10

  //   StatementTitle has the following unique values:
  //       Cost of goods
  //       Earnings
  //       Extraordinary costs
  //       Extraordinary revenues
  //       Income from investments in subsidiaries
  //       Income on investment. in an affiliate
  //       Income on investment. Other enterprise in SME group
  //       Inventories
  //       Labor costs
  //       Net income
  //       Ordinary depreciation
  //       Other finance costs
  //       Other operating costs
  //       Other operating income
  //       Profit After tax
  //       Profit before tax
  //       Tax
  //       Tax extraordinary
  //       Total Cost
  //       Total finance costs
  //       Total financial income
  //       Total operating revenues
  //       Total other finance costs
  //       Total other financial income
  //       Total other interest expense
  //       Total other interest income
  //       Total sales revenue

  //   When responding:

  //       Provide detailed explanations based on the data from the files.
  //       When the answer is a list, return the response in a Markdown table format with appropriate headings (e.g., "Item", "Amount", "Category").
  //       If calculations are required, show the step-by-step breakdown and final results.
  //       If trends or significant insights are identified (e.g., profit margins, expense patterns, or irregularities in vouchers), highlight them clearly.

  //   Use your financial expertise to interpret complex data and provide insights that can support decision-making.
  // `
  // const file = await openai.files.create({
  //   file: fs.createReadStream('revenue-forecast.csv'),
  //   purpose: 'assistants'
  // })

  const stream = await openai.beta.threads.createAndRun({
    assistant_id: assistantId,
    // instructions: instructions,
    temperature: 0,
    thread: {
      messages: messages
    },
    stream: true,
    tools: [{ type: 'code_interpreter' }],
    tool_resources: {
      code_interpreter: {
        file_ids: [
          process.env.PROFIT_AND_LOST_FILE_ID,
          process.env.VOUCHER_FILE_ID
        ]
      }
    }
  })
  const pattern = /【\d+:\d+†source】/g
  let final_answer = ''
  for await (const event of stream) {
    console.log(event)
    if (event.event == 'thread.message.completed') {
      final_answer = event.data.content[0].text.value
      console.log('final answer is:' + final_answer)
      const title = json.messages[0].content.substring(0, 100)
      const id = json.id ?? generateUUID()
      const createdAt = Date.now()
      const path = `/chat/${id}`
      const payload = {
        id,
        title,
        userId,
        createdAt,
        path,
        messages: [
          ...messages,
          {
            content: final_answer.replace(pattern, ''),
            role: 'assistant'
          }
        ]
      }
      // Insert chat into database.
      const { data: record, error: record_error } = await supabase
        .from('chats')
        .select('*')
        .eq('chat_id', json.id)
        .maybeSingle()
        .throwOnError()

      if (record?.id) {
        await supabase
          .from('chats')
          .update({ payload: payload })
          .eq('chat_id', json.id)
      } else {
        await supabase
          .from('chats')
          .insert({ chat_id: id, user_id: userId, payload: payload })
      }
    }
  }

  final_answer = final_answer.replace(pattern, '')
  // Create a readable stream from the text message
  const stream_readable = new ReadableStream({
    start(controller) {
      // Convert the text message to a Uint8Array and enqueue it
      const encoder = new TextEncoder()
      const chunk = encoder.encode(final_answer)

      // Enqueue the chunk
      controller.enqueue(chunk)

      // Close the stream
      controller.close()
    }
  })

  return new StreamingTextResponse(stream_readable)

  // const stream_res = openai.beta.threads.runs
  //   .stream(threadId, {
  //     assistant_id: assistantId
  //   })
  //   .on('textDone', async (content: Text, snapshot: Message) => {
  //     console.log(`content: ${JSON.stringify(content, null, 4)}`)
  //     console.log(`Completion is: ${content.value}`)

  // return new Response(stream_res.toReadableStream())
  // return new StreamingTextResponse(stream_res)
}
