const groq = require("../config/groq");
const ApiError = require('../utils/ApiError');

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Sends a chat completion request to Groq and returns the full text.
 * `messages` is the standard OpenAI-style [{role, content}] array — Groq's
 * API is OpenAI-compatible, so no format conversion is needed here (unlike
 * the old Gemini integration, which required mapping to {role, parts}).
 */
const chatComplete = async (messages, options = {}) => {
  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxTokens ?? 1000,
      response_format:
        options.responseMimeType === "application/json"
          ? { type: "json_object" }
          : undefined,
    });

    const finishReason = response.choices?.[0]?.finish_reason;
    if (finishReason === 'length') {
      console.warn(
        `[Groq] Response was cut off (finish_reason=length). ` +
        `Consider raising maxTokens for this call — current limit: ${options.maxTokens ?? 1000}`
      );
    }

    return response.choices?.[0]?.message?.content?.trim() || '';
  } catch (err) {
    console.log("========== GROQ ERROR ==========");
    console.error(err);
    console.log("=================================");
    throw err;
  }
};

/**
 * Streaming variant used by the chatbot's SSE endpoint. Calls `onToken`
 * with each incremental text delta as it arrives and returns the full
 * accumulated reply once the stream ends.
 */
const chatCompleteStream = async (messages, onToken, options = {}) => {
  let full = '';

  try {
    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxTokens ?? 1000,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        full += delta;
        onToken(delta);
      }
    }

    return full;
  } catch (err) {
    console.log("========== GROQ STREAM ERROR ==========");
    console.error(err);
    console.log("=========================================");
    throw err;
  }
};

/**
 * Runs a chat completion in JSON mode and parses the result. Used by the
 * ATS scorer and job matcher, which expect structured output.
 */
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
      maxTokens: options.maxTokens ?? 4000,
      responseMimeType: "application/json",
    }
  );

  const cleaned = raw
    .replace(/^```json/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Invalid JSON returned by Groq:");
    console.error(cleaned);
    throw err;
  }
};

module.exports = {
  chatComplete,
  chatCompleteStream,
  extractJSON,
};
