import { ChatOpenAI } from "@langchain/openai";
import { tool } from "langchain/tools";
import { z } from "zod";
import * as dotenv from "dotenv";
import { SystemMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
dotenv.config();

const systemPrompt = `You are a location-aware assistant.

When the user asks for recommendations:
1. Always call the location tool first
2. Use the location to tailor suggestions
3. Prefer well-known areas, neighborhoods, or general categories
4. Do not fabricate highly specific businesses unless confident`;

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.3,
  maxTokens: 500,
});

const getUserLocation = tool(
  async () => {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    console.log("Raw location data:", data);

    if (data.error) {
      return "Location unavailable due to API rate limit";
    }

    return `City: ${data.city}, Region: ${data.region}, Country: ${data.country_name}`;
  },
  {
    name: "get_user_location",
    description: "Get the user's current location based on IP address",
  }
);


/*const responseFormat = z.object({
  location: z.string(),
  recommendations: z.array(z.string()),
  reasoning: z.string(),
});*/

async function runToolExample() {
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.1,
  });

  // Bind the tools to the LLM
  const llmWithTools = llm.bindTools([getUserLocation]);

  // Example 1: Simple tool usage
  console.log("=== Example 1: Basic Tool Usage ===");
  const response1 = await llmWithTools.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage("What should I do today?")
  ]);
  
  console.log("AI Response:", response1.content);
  console.log("Tool calls:", response1.tool_calls);

  if (response1.tool_calls?.length) {
    const toolCall = response1.tool_calls[0];

    const toolResult = await getUserLocation.invoke(toolCall.args);

    const finalResponse = await llmWithTools.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage("What should I do today?"),
      response1,
      new ToolMessage({
        tool_call_id: toolCall.id,
        content: toolResult,
      }),
    ]);

    console.log("Final Response:", finalResponse.content);
  }

}

runToolExample();