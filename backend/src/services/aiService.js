const { getOpenAIClient, OPENAI_MODEL } = require('../config/openai');
const ApiError = require('../utils/ApiError');

const chatComplete = async (messages, options = {}) => {
  const client = getOpenAIClient();

  try {
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxTokens ?? 1000,
    });

    return completion.choices[0]?.message?.content?.trim() || '';
  } catch (err) {
    console.log("========== OPENAI ERROR ==========");
    console.error(err);
    console.log("=================================");
    throw err;
  }
};

const chatCompleteStream = async (messages, onToken, options = {}) => {
  const client = getOpenAIClient();
  let full = '';

  try {
    const stream = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxTokens ?? 1000,
      stream: true,
    });

    for await (const part of stream) {
      const delta = part.choices?.[0]?.delta?.content;

      if (delta) {
        full += delta;
        onToken(delta);
      }
    }

    return full;
  } catch (err) {
    console.log("========== OPENAI STREAM ERROR ==========");
    console.error(err);
    console.log("=========================================");
    throw err;
  }
};

const extractJSON = async (systemPrompt, userPrompt, options = {}) => {
  const raw = await chatComplete(
    [
      {
        role: 'system',
        content: `${systemPrompt}\n\nRespond ONLY with valid JSON.`,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    {
      temperature: options.temperature ?? 0.3,
      maxTokens: options.maxTokens ?? 1500,
    }
  );

  const cleaned = raw
    .replace(/^```json/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(cleaned);
};

module.exports = {
  chatComplete,
  chatCompleteStream,
  extractJSON,
};