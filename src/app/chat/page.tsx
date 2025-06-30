"use client";

import { useChat } from "@ai-sdk/react";
import { Send, User, Bot, X, Plus } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

import { Thinking } from "./thinking";
import { Message } from "./message";

export default function ChatPage() {
  const [isThinking, setIsThinking] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [newTip, setNewTip] = useState("");
  const [showAddTip, setShowAddTip] = useState(false);

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

  // 新しいtipを追加
  const addTip = () => {
    if (newTip.trim() && !tips.includes(newTip.trim())) {
      setTips([...tips, newTip.trim()]);
      setNewTip("");
      setShowAddTip(false);
    }
  };

  // tipを削除
  const removeTip = (tipToRemove: string) => {
    setTips(tips.filter((tip) => tip !== tipToRemove));
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
            <button
              onClick={() => setShowAddTip(!showAddTip)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Plus className="w-3 h-3" />
              追加
            </button>
          </div>

          {showAddTip && (
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={newTip}
                onChange={(e) => setNewTip(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTip();
                  }
                  if (e.key === "Escape") {
                    setShowAddTip(false);
                    setNewTip("");
                  }
                }}
                placeholder="新しい提案を入力..."
                className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={addTip}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
              >
                追加
              </button>
            </div>
          )}

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
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  setIsThinking(true);
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="料理について何でも聞いてください..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              disabled={isLoading || isThinking}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isThinking}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
