export let assistantId = 'asst_wMFxvPdrI4G3l09TxYkAB2HH' // set your assistant ID here

if (assistantId === '') {
  assistantId = process.env.OPENAI_ASSISTANT_ID
}
