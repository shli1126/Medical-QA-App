import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "",
  dangerouslyAllowBrowser: true,
});

export async function sendMsgToOpenAI(message) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: message }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error in OpenAI call:", error);
    throw error;
  }
}
