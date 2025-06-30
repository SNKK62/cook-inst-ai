import { Bot, User } from "lucide-react";
import { Message as AIMessage } from "@ai-sdk/react";

export function Message({ message }: { message: AIMessage }) {
  return (
    <div
      className={`flex ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`flex max-w-3xl ${
          message.role === "user" ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`flex-shrink-0 ${
            message.role === "user" ? "ml-3" : "mr-3"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              message.role === "user"
                ? "bg-blue-500 text-white"
                : "bg-orange-500 text-white"
            }`}
          >
            {message.role === "user" ? (
              <User className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>
        </div>
        <div
          className={`px-4 py-2 rounded-lg ${
            message.role === "user"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-800 border border-gray-200"
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
          <div
            className={`text-xs mt-1 ${
              message.role === "user" ? "text-blue-100" : "text-gray-500"
            }`}
          >
            {message.createdAt?.toLocaleTimeString() ||
              new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
