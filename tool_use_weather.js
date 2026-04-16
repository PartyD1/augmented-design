import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import * as dotenv from "dotenv";
dotenv.config();

async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
  const res = await fetch(url);
  const data = await res.json();
  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
}

async function fetchWeather(latitude, longitude) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&temperature_unit=farenheit&wind_speed_unit=mph`;
  const res = await fetch(url);
  const data = await res.json();
  return data.current;
}

const getWeather = tool(
  async ({ city }) => {
    const { latitude, longitude, name, country } = await geocodeCity(city);
    const current = await fetchWeather(latitude, longitude);
    return (
      `Weather in ${name}, ${country}: ` +
      `Temperature: ${current.temperature_2m}°F, ` +
      `Humidity: ${current.relative_humidity_2m}%, ` +
      `Wind Speed: ${current.wind_speed_10m} mph, ` +
      `Weather Code: ${current.weather_code}`
    );
  },
  {
    name: "get_weather",
    description: "Get the current weather for a given city using Open-Meteo.",
    schema: z.object({
      city: z.string().describe("The name of the city to get weather for"),
    }),
  }
);

async function chat(userMessage) {
  const llm = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
  const llmWithTools = llm.bindTools([getWeather]);
  const messages = [new HumanMessage(userMessage)];

  const response = await llmWithTools.invoke(messages);
  messages.push(response);

  if (response.tool_calls && response.tool_calls.length > 0) {
    for (const toolCall of response.tool_calls) {
      const toolResult = await getWeather.invoke(toolCall.args);
      messages.push(new ToolMessage({ content: toolResult, tool_call_id: toolCall.id }));
    }
    const finalResponse = await llmWithTools.invoke(messages);
    return finalResponse.content;
  }

  return response.content;
}

async function main() {
  const answer = await chat("What's the weather in New York City right now?");
  console.log("Answer:", answer);
}

main();