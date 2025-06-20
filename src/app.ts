import { createUserContent, GoogleGenAI } from "@google/genai";
import { config } from "dotenv";
import { exec } from "child_process";
import { ParsedResponse, ToolBox } from "../types";

config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

function sysCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error Message: ${error.message}\n Error Name: ${error.name}\n Error Stack: ${error.stack}`);
            }
            if (stderr) {
                resolve(`STDERR: ${stderr}\n`);
            }
            resolve(`STDOUT: ${stdout}\n`);
        });
    });
}

function addTwoNumber(number1: number, number2: number): number {
    return number1 + number2;
}

function getWeather(city: string): string {
    return "32 degree C";
}

const toolBox: ToolBox = {
    addTwoNumber,
    getWeather,
    sysCommand
};

const SYSTEM_PROMPT = `
  You are my assistant who is going to help me to solve all the problem I face and also resolve all my queries.

  You should follow this Modes only 'START', 'THINK', 'ACTION', 'OBSERVE', 'OUTPUT'

  In the START phase, user gives a query. Then, you have to be in THINK mode and think how to resolve the user query at least 2-3 times. Then if necessary then start the ACTION mode with the required inputs from the user prompt and wait for the OBSERVE which is the output of the action tool. Based on the OBSERVE in the previous step if it is required to call the ACTION mode then call it and repeat the process until user query is satisfied at the end end the conversation with OUTPUT mode.

  Always use the tool from the available tools only.
  Tools Available:
  - getWeather(city: string): string;
  - addTwoNumber(number1: number, number2: number): number;
  - sysCommand(command: string): Promise<string>;

  Rules:
  - Always wait for next step.
  - Move one step at a time.
  - Only use the tools available from the tools above.
  - Output should be strictly in JSON.
  
  Flow Example 1:
  START: "Add these 3, 4 and give me the result."
  THINK: "Ok, user asked me to add 3 and 4, then give the result, therefore I need to call the 'addTwoNumber' tool from the toolchain."
  ACTION: "Call Tool addTwoNumber(3, 4)"
  OBSERVE: "7"
  THINK: "The output of addTwoNumber is 7"
  OUTPUT: "The sum of 3 and 4 is 7"
  
  Input: "what is the sum of 3 and 4"
  Output Example:
  Output {status: "THINK", message: "Ok, user asked me to add 3 and 4, then give the result"}
  Output {status: "ACTION", params: [3, 4], tool: "addTwoNumber"}
  Output {status: "OBSERVE", output: "7"}
  Output {status: "THINK", message: "I got the answer, the sum of 3, 4 is 7"}
  Output {status: "OUTPUT", message: "The sum of 3 and 4 is 7."}

  Flow Example 2:
  START: "Get me the weather of Jamshedpur"
  THINK: "User asked me for the weather of Jamshedpur"
  ACTION: "Call Tool getWeather("jamshedpur")"
  OBSERVE: "32 degree C"
  THINK: "Weather of jamshedpur is 32 degree C"
  OUTPUT: "According to the current weather report, today's the weather of jamshedpur is 32 degree C."

  Input: "Get me the weather of Jamshedpur"
  Output Example:
  Output {status: "THINK", message: "User asked me for the weather of Jamshedpur"}
  Output {status: "ACTION", params: ["jamshedpur"], tool: "getWeather"}
  Output {status: "OBSERVE", output: "32 degree C"}
  Output {status: "THINK", message: "Weather of jamshedpur is 32 degree C"}
  Output {status: "OUTPUT", message: "According to the current weather report, today's the weather of jamshedpur is 32 degree C."}

  Output Format:
  {status: string, message: string, tool: string, params: string[]}
`;

const messages: { role: string; text: string }[] = [
    {
        role: "user",
        text: "Help me to create a simple nodejs file where a simple express server code is implemented with a single testing route"
    },
];

async function main() {
    while (true) {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: createUserContent(messages),
            config: {
                responseMimeType: "application/json",
                systemInstruction: SYSTEM_PROMPT,
            },
        });

        const parsedResponse: ParsedResponse = JSON.parse(response.text ?? "{}");

        messages.push({
            role: "model",
            text: JSON.stringify(parsedResponse)
        });

        if (parsedResponse.status && parsedResponse.status === "THINK") {
            console.log(`AI: ${parsedResponse.message}`);
            continue;
        }

        if (parsedResponse.status && parsedResponse.status === "OBSERVE") {
            console.log(`AI: Tool Response:  ${parsedResponse.output}`);
            continue;
        }

        if (parsedResponse.status && parsedResponse.status === "ACTION") {
            console.log(`AI(Tool call): Tool = ${parsedResponse.tool}, Params: ${parsedResponse.params} `);
            if (parsedResponse.tool && parsedResponse.tool in toolBox) {
                
                let output;
                if (parsedResponse.tool === "addTwoNumber") {
                   
                    const [a, b] = parsedResponse.params ?? [];
                    output = await addTwoNumber(Number(a), Number(b));
                } else if (parsedResponse.tool === "getWeather") {
                    const [city] = parsedResponse.params ?? [];
                    output = await getWeather(String(city));
                } else if (parsedResponse.tool === "sysCommand") {
                    const [command] = parsedResponse.params ?? [];
                    output = await sysCommand(String(command));
                } else {
                    output = `Invalid tool: ${parsedResponse.tool}`;
                }
                messages.push({
                    role: "user",
                    text: JSON.stringify({ status: 'OBSERVE', output })
                });
            } else {
                console.error(`Invalid tool: ${parsedResponse.tool}`);
                messages.push({
                    role: "user",
                    text: JSON.stringify({ status: 'OBSERVE', output: `Invalid tool: ${parsedResponse.tool}` })
                });
            }
            continue;
        }

        if (parsedResponse.status && parsedResponse.status === "OUTPUT") {
            console.log(`AI: ${parsedResponse.message}`);
            break;
        }
    }
}

await main();