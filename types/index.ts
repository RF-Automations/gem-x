export interface ParsedResponse {
  status: "THINK" | "OBSERVE" | "ACTION" | "OUTPUT";
  message?: string;
  tool?: string;
  params?: any[];
  output?: any;
}

export interface ToolBox {
  addTwoNumber: (number1: number, number2: number) => number;
  getWeather: (city: string) => string;
  sysCommand: (command: string) => Promise<string>;
}