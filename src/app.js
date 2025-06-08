import { GoogleGenAI, Type } from "@google/genai";
import { config, parse } from "dotenv";

config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

function addTwoNumber(number1, number2) {
  return number1 + number2;
}

function getWeather(city) {
  return "32 degree C";
}

const toolBox = {
  addTwoNumber: addTwoNumber,
  getWeather: getWeather,
};

const tempPrompt = `
You are expert an full stack web developer experience in Javascript ecosystem. You also have pratical handson on Typescript. And whenever you are asked to create the web based project you should always prefer react for frontend and should also use zustand for state managment if required or asked by the user to use any state managment libary. And if project requires to implement backend then always use nodejs with typescript and express as the default for creating http server.
`;
const SYSTEM_PROMPT = `
  You are my assistant who is going to help me to solve all the problem I face and also resolve all my queries.
  You should always follow the output formate only step by step and the output should be in one of the object only from the given formate.

  You should follow this Status always 'START', 'THINK', 'ACTION', 'OUTPUT'

  How the process is going to look like: Example 1

  START: "Add these 3, 4 and give me the result."
  THINK: "Ok, user asked me to add 3 and 4, then give the result"
  ACTION: "this is the tool I am going to use for adding 2 number addTwoNumber."
  THINK: "I got the answer, the sum of 3, 4 is 7"
  OUTPUT: "The sum of 3 and 4 is 7."


  Output formate:
  {status: "START", message: "Add these 3, 4 and give me the result."}
  {status: "THINK", message: "Ok, user asked me to add 3 and 4, then give the result}
  {status: "ACTION", params: [parma1, param2, ..., param], tool: "addTwoNumber"}
  {status: "THINK", message: "I got the answer, the sum of 3, 4 is 7"}
  {status: "OUTPUT", message: "The sum of 3 and 4 is 7."}


`;

const messages = [SYSTEM_PROMPT, "Give me the sum of 1000 and 1000"];


const properties = {
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["START", "THINK", "ACTION", "OUTPUT"],
      "description": "The current step status in the reasoning process"
    },
    "message": {
      "type": "string",
      "description": "Human-readable message describing the current step"
    },
    "params": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Parameters for the action (only present when status is ACTION)"
    },
    "tool": {
      "type": "string",
      "description": "Name of the tool to execute (only present when status is ACTION)"
    }
  },
  "required": ["status", "message"],
  "additionalProperties": false,
  "oneOf": [
    {
      "properties": {
        "status": { "const": "START" },
        "message": { "type": "string" }
      },
      "required": ["status", "message"],
      "additionalProperties": false
    },
    {
      "properties": {
        "status": { "const": "THINK" },
        "message": { "type": "string" }
      },
      "required": ["status", "message"],
      "additionalProperties": false
    },
    {
      "properties": {
        "status": { "const": "ACTION" },
        "message": { "type": "string" },
        "params": {
          "type": "array",
          "items": { "type": "string" }
        },
        "tool": { "type": "string" }
      },
      "required": ["status", "message", "params", "tool"],
      "additionalProperties": false
    },
    {
      "properties": {
        "status": { "const": "OUTPUT" },
        "message": { "type": "string" }
      },
      "required": ["status", "message"],
      "additionalProperties": false
    }
  ]
}

console.log(Object.values(properties.properties))

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: messages,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties
      },
    },
  });

  const parsedResponse = JSON.parse(response.text);

  console.log(parsedResponse);

  if (parsedResponse.status && parsedResponse.status === "START") {
    console.log(parsedResponse.message);
  }

  if (parsedResponse.status && parsedResponse.status === "THINK") {
    console.log(parsedResponse.message);
  }

  if (parsedResponse.status && parsedResponse.status === "ACTION") {
    toolBox[parsedResponse.tool]([...parsedResponse.parms]);
  }

  if (parsedResponse.status && parsedResponse.status === "OUTPUT") {
    console.log(parsedResponse.message);
  }
}

await main();
