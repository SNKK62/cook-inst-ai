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

const generateUUID = () => {
  return crypto.randomUUID();
};

export default function ChatPage() {
  const [isThinking, setIsThinking] = useState(false);
  const [mode, setMode] = useState<"ask" | "query" | "selection">("ask");
  const [isComposition, setIsComposition] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const {
    messages: textMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    api: "/api/chat",
    onResponse: (response) => {
      setIsThinking(false);
      console.log("API Response:", response);
    },
    onError: (error) => {
      console.error("Chat Error:", error);
    },
    onFinish: (message) => {
      setMode("query");
      console.log("Chat Finished:", message);
    },
  });

  useEffect(() => {
    if (mode === "ask") {
      const lastAssistantMessage = textMessages
        .filter((m) => m.role === "assistant")
        .pop();
      if (!lastAssistantMessage) return;
      // マークダウンのリストアイテムを抽出
      const listItems = lastAssistantMessage.content
        .split("\n")
        .filter((line) => line.trim().startsWith("- "))
        .map((line) => line.trim().substring(2)); // "- " を除去
      setMessages((prev) => {
        const lastMessage = prev.slice(-1)[0];
        return [
          ...(lastMessage?.type === "tip" ? prev.slice(0, -1) : prev),
          {
            id: generateUUID(),
            type: "tip",
            content: listItems,
            selected: listItems,
            createdAt: new Date(),
          },
        ];
      });
    }
  }, [textMessages, mode]);

  const addTip = () => {
    const message = messages.filter((m) => m.type === "tip").pop();
    if (!message) return;
    if (!input.trim()) return;
    if (message.selected.includes(input.trim())) return;
    const newTip = input.trim();
    setMessages((prev) => {
      const selectedMessage = prev.find((m) => m.id === message.id);
      return [
        ...prev.filter((m) => m.id !== message.id),
        {
          ...selectedMessage,
          content: [...selectedMessage.content, newTip],
          selected: [...selectedMessage.selected, newTip],
          createdAt: new Date(),
        },
      ];
    });
    handleInputChange({
      target: { value: "" },
    } as React.ChangeEvent<HTMLTextAreaElement>);
  };

  const removeTip = (message: any) => {
    return (tipToRemove: string) => {
      setMessages((prev) => {
        return prev.map((m) => {
          if (m.id === message.id) {
            return {
              ...m,
              content: m.content.filter((tip: string) => tip !== tipToRemove),
              selected: m.selected.filter((tip: string) => tip !== tipToRemove),
            };
          }
          return m;
        });
      });
    };
  };

  const toggleTipSelection = (message: any) => {
    return (tip: string) => {
      setMessages((prev) => {
        return prev.map((m) => {
          if (m.id === message.id) {
            return {
              ...m,
              selected: m.selected.includes(tip)
                ? m.selected.filter((t: string) => t !== tip)
                : [...m.selected, tip],
            };
          }
          return m;
        });
      });
    };
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "ask") {
      setIsThinking(true);
      handleSubmit(e);
    } else if (mode === "query") {
      const lastMessage = messages.filter((m) => m.type === "tip").pop();
      if (!lastMessage) return;
      fetchRecipes(lastMessage.selected).then((res) => {
        console.log(res);
        setMessages((prev) => {
          return [
            ...prev,
            { id: generateUUID(), type: "candidates", content: res.results },
          ];
        });
        setMode("selection");
      });
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

  const getButtonText = (message: any) => {
    switch (mode) {
      case "query":
        return `検索 (${message.selected.length}個選択)`;
      default:
        return <Send className="w-4 h-4" />;
    }
  };

  const lastMessage = useMemo(() => {
    return messages.slice(-1)[0];
  }, [messages]);

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
          <Message
            key={message.id}
            message={message}
            removeTip={removeTip(message)}
            toggleTipSelection={toggleTipSelection(message)}
          />
        ))}

        {isThinking && <Thinking />}
      </div>

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
                ? lastMessage.selected.length === 0 || isLoading || isThinking
                : !input.trim() || isLoading || isThinking
            }
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getButtonText(lastMessage)}
          </button>
        </form>
      </div>
    </div>
  );
}
