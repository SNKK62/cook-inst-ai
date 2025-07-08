export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "image" | "tips" | "recipe";
  tips?: string[];
  selectedTips?: string[];
  recipes?: any[];
  timestamp: Date;
}
