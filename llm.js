import { ChatOpenAI } from "@langchain/openai";
import { tool } from "langchain/tools";
import { z } from "zod";
import * as dotenv from "dotenv";
dotenv.config();

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 1000,
});
const systemPrompt = `You are an expert basketball analyst. You explain what each statistic is.`;
const getNBAStats = tool(
  ({ player }) => {
    const fakeDB = {
      "lebron james": "27 PPG, 7 RPG, 7 APG",
      "stephen curry": "29 PPG, 5 RPG, 6 APG",
      "kevin durant": "28 PPG, 6 RPG, 5 APG",
    };
    return fakeDB[player.toLowerCase()] || "Player not found";
  },
  {
    name: "get_nba_stats",
    description: "Get current NBA stats for a player",
    schema: z.object({ player: z.string() }),
  }
);

const getJoke = tool(
  () => "Why did the basketball player go to jail? He shot the ball.",
  {
    name: "get_joke",
    description: "Returns a random joke",
    schema: z.object({}),
  }
);

async function run() {
  const userInput = "Give me Stephen Curry stats and a basketball joke";

  const stats = await getNBAStats.invoke({ player: "Stephen Curry" });
  const joke = await getJoke.invoke({});

  console.log(`Stats: ${stats}`);
  console.log(`Joke: ${joke}`);

  const response = await model.invoke(
    `You are an expert basketball analyst.\n${userInput}\nStats: ${stats}\nJoke: ${joke}`
  );

  console.log("LLM Output:\n", response);
}

run();