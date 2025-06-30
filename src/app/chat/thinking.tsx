import { Bot } from "lucide-react";
export function Thinking() {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-3xl">
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-white text-gray-800 border border-gray-200 px-4 py-2 rounded-lg">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
