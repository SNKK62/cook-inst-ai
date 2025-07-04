"use client";

import { useChat } from "@ai-sdk/react";
import { Send, User, Bot, X, Plus } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

import { Thinking } from "./thinking";
import { Message } from "./message";

const fetchRecipes = async (ingredients: string[]) => {
  const response = await fetch(
    `/api/recipes?ingredients=${ingredients.join(",")}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return response.json();
};

export default function ChatPage() {
  const [isThinking, setIsThinking] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [mode, setMode] = useState<"ask" | "add" | "query">("ask");
  const [isComposition, setIsComposition] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      onResponse: (response) => {
        setIsThinking(false);
        console.log("API Response:", response);
      },
      onError: (error) => {
        console.error("Chat Error:", error);
      },
    });

  // 最新のアシスタントメッセージからtipを抽出
  const extractedTips = useMemo(() => {
    const lastAssistantMessage = messages
      .filter((m) => m.role === "assistant")
      .pop();

    if (!lastAssistantMessage) return [];

    // マークダウンのリストアイテムを抽出
    const listItems = lastAssistantMessage.content
      .split("\n")
      .filter((line) => line.trim().startsWith("- "))
      .map((line) => line.trim().substring(2)); // "- " を除去

    return listItems;
  }, [messages]);

  useEffect(() => {
    setTips(extractedTips);
  }, [extractedTips]);

  const addTip = () => {
    if (input.trim() && !tips.includes(input.trim())) {
      setTips([...tips, input.trim()]);
      handleInputChange({
        target: { value: "" },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    }
  };

  const removeTip = (tipToRemove: string) => {
    setTips(tips.filter((tip) => tip !== tipToRemove));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "ask") {
      setIsThinking(true);
      handleSubmit(e);
      setMode("query");
    } else if (mode === "query") {
      fetchRecipes(tips).then((res) => {
        console.log(res);
      });
      setMode("ask");
    }
  };

  // プレースホルダーとボタンテキストを動的に変更
  const getPlaceholder = () => {
    switch (mode) {
      case "query":
        return "新しい提案を入力...";
      default:
        return "料理について何でも聞いてください...";
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case "query":
        return "検索";
      default:
        return <Send className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-800">
          Cooking Assistant
        </h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">料理について何でもお聞きください！</p>
            <p className="text-sm mt-2 text-gray-400">
              レシピ、調理法、食材の選び方など、お手伝いします
            </p>
          </div>
        )}

        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}

        {isThinking && <Thinking />}
      </div>

      {/* Tips */}
      {tips.length > 0 && (
        <div className="bg-blue-50 border-t border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-700 font-medium">提案:</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tips.map((tip, index) => {
              return (
                <div
                  key={`${tip}-${index}`}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm rounded-full border border-blue-300 transition-colors duration-200"
                >
                  <button
                    onClick={() => {
                      handleInputChange({
                        target: { value: tip },
                      } as React.ChangeEvent<HTMLTextAreaElement>);
                    }}
                    className="flex-1"
                  >
                    {tip}
                  </button>
                  <button
                    onClick={() => removeTip(tip)}
                    className="ml-1 text-blue-600 hover:text-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleFormSubmit} className="flex space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isComposition) {
                  e.preventDefault();
                  handleFormSubmit(e);
                }
              }}
              onCompositionStart={() => setIsComposition(true)}
              onCompositionEnd={() => setIsComposition(false)}
              placeholder={getPlaceholder()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              disabled={isLoading || isThinking}
            />
          </div>
          {mode === "query" && (
            <button
              type="button"
              disabled={!input.trim() || isLoading || isThinking}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => {
                addTip();
                e.stopPropagation();
              }}
            >
              追加
            </button>
          )}
          <button
            type="submit"
            disabled={
              mode === "query"
                ? isLoading || isThinking
                : !input.trim() || isLoading || isThinking
            }
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getButtonText()}
          </button>
        </form>
      </div>
    </div>
  );
}
