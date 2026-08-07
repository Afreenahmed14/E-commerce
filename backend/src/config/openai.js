// // const OpenAI = require('openai');
// const OpenAI = require("openai").default;

// /**
//  * Single shared OpenAI client, mirroring the pattern used by
//  * config/cloudinary.js and config/firebase.js. Reads OPENAI_API_KEY from
//  * the environment — never hardcode keys here.
//  */
// let client = null;

// const getOpenAIClient = () => {
//   if (!client) {
//     if (!process.env.OPENAI_API_KEY) {
//       console.warn('[OpenAI] OPENAI_API_KEY is not set — AI features will fail until it is configured.');
//     }
//     client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//   }
//   return client;
// };

// // Centralized so every AI feature (chatbot, ATS, job matching, MCQ gen,
// // admin insights) uses the same model without duplicating string literals.
// const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// module.exports = { getOpenAIClient, OPENAI_MODEL };
const OpenAI = require('openai');

let client = null;

const getOpenAIClient = () => {
  if (!client) {
    console.log("OpenAI Key Length:", process.env.OPENAI_API_KEY?.length);

    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return client;
};

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

module.exports = { getOpenAIClient, OPENAI_MODEL };