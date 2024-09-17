export let assistantId = 'asst_YUF38TD9d7oLdfu7d54yUwAh' // set your assistant ID here

if (assistantId === '') {
  assistantId = process.env.OPENAI_ASSISTANT_ID!
}
