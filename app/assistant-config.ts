export let assistantId = 'asst_xEpMYm1BgNvpH6BbRCDGJ5Fz' // set your assistant ID here

if (assistantId === '') {
  assistantId = process.env.OPENAI_ASSISTANT_ID!
}
