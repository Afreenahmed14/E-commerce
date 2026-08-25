require("dotenv").config();

const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function main() {
  try {
    console.log(
      "GROQ_API_KEY:",
      process.env.GROQ_API_KEY ? "Loaded ✅" : "Missing ❌"
    );

    const models = await groq.models.list();

    console.log("\nAvailable Groq models:\n");

    for (const model of models.data) {
      console.log(model.id);
    }
  } catch (err) {
    console.error("\nGroq model list error:");
    console.error(err.message);
  }
}

main();
