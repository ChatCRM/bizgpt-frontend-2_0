export let assistantId = 'asst_tYubBEplp9QhQdcYOKXiiZiF' // set your assistant ID here

if (assistantId === '') {
  assistantId = process.env.OPENAI_ASSISTANT_ID!
}
