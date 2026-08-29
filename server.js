const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));

app.use(express.static(path.join(__dirname, "public")));


// ============================================================
// GROQ API
// ============================================================

app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, engine } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "Please provide a prompt."
      });
    }

    if (prompt.length > 100000) {
      return res.status(400).json({
        error: "Prompt is too large."
      });
    }


    const systemPrompt = `
You are an expert Roblox Studio developer specializing in Luau.

The user is building a Roblox game.

Write clean, production-quality Luau.

IMPORTANT RULES:

1. Use real Roblox APIs only.
2. Do not invent Roblox services.
3. Clearly label where every script belongs.
4. Use ModuleScripts for reusable systems.
5. Use ServerScriptService for server-authoritative logic.
6. Use ReplicatedStorage for shared modules and RemoteEvents.
7. Use StarterPlayerScripts for client-side systems.
8. Never put secrets or API keys into Roblox scripts.
9. Validate RemoteEvents on the server.
10. Never trust the client with money, inventory, XP, purchases, or rewards.
11. If the requested system is large, split it into multiple scripts.
12. Give complete working code for the important systems.
13. Explain exactly where each script should be placed.
14. If a 3D model, animation, sound, image, or other asset is required, create a placeholder system and explain the required asset name.
15. Make the architecture expandable.

Target platform:
${engine || "Roblox Studio (Luau)"}
`;


    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          model: "openai/gpt-oss-20b",

          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ],

          temperature: 0.2,

          max_completion_tokens: 8192
        })
      }
    );


    const data = await groqResponse.json();


    if (!groqResponse.ok) {
      console.error("Groq error:", data);

      return res.status(groqResponse.status).json({
        error:
          data?.error?.message ||
          "Groq returned an error."
      });
    }


    const generatedCode =
      data?.choices?.[0]?.message?.content;


    if (!generatedCode) {
      console.error("Unexpected Groq response:", data);

      return res.status(500).json({
        error: "Groq returned no generated content."
      });
    }


    return res.json({
      code: generatedCode
    });

  } catch (error) {

    console.error("SERVER ERROR:", error);

    return res.status(500).json({
      error: error.message || "Internal server error."
    });
  }
});


// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log("");
  console.log("==========================================");
  console.log(" Roblox AI Script Generator");
  console.log("==========================================");
  console.log(`Running at http://localhost:${PORT}`);
  console.log("==========================================");
  console.log("");
});
