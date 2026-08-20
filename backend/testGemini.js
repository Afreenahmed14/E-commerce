require("dotenv").config();

const ai = require("./src/config/gemini");

async function test() {
  try {
    const response = await ai.models.generateContent({
      // model: "models/gemini-2.0-flash",
      // model: process.env.GEMINI_MODEL,
      model: "models/gemini-flash-latest",
      contents: "Say Hello",
    });

    console.log(response.text);
  } catch (err) {
    console.error(err);
  }
}

test();