"use client";

import { Send, Bot, X, Plus } from "lucide-react";
import { useState, useEffect } from "react";

import { ChatMessage } from "./type";
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

const detectImage = async (image: string): Promise<{ image: string }> => {
  const response = await fetch("/api/detect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image }),
  });
  return response.json();
};

const getIngredients = async (image_url: string) => {
  const response = await fetch("/api/ingredients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: image_url }),
  });
  return response.json();
};

const processIngredients = async (
  image_url: string,
  addMessages: (message: ChatMessage) => void,
  updateMessage: (message: ChatMessage) => void
) => {
  const response = await getIngredients(image_url);

  if (!response.ok) {
    throw new Error("API request failed");
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let assistantContent = "";

  const assistantMessage: ChatMessage = {
    id: generateUUID(),
    content: "",
    role: "assistant",
    type: "tips",
    tips: [],
    selectedTips: [], // 初期状態では全て選択
    timestamp: new Date(),
  };

  addMessages(assistantMessage);

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith('0:"')) {
          const content = line.slice(3, -1);
          assistantContent += content
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"');
        }
      }

      // レスポンス完了後、tipsを抽出
      const listItems = assistantContent
        .split("\n")
        .filter((line) => line.trim().startsWith("- "))
        .map((line) => line.trim().substring(2));

      if (listItems.length > 0) {
        assistantMessage.tips = listItems;
        assistantMessage.selectedTips = listItems;
        updateMessage(assistantMessage);
      }
    }
  }
};
const generateUUID = () => {
  return crypto.randomUUID();
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"ask" | "query" | "selection">("ask");
  const [isComposition, setIsComposition] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 最新のtipsメッセージを取得
  const latestTipsMessage = messages.filter((m) => m.type === "tips").pop();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleFileInput = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setSelectedImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (messageContent: string, isImage = false) => {
    if (!messageContent.trim() && !isImage) return;

    const userMessage: ChatMessage = {
      id: generateUUID(),
      role: "user",
      content: isImage ? selectedImage! : messageContent,
      type: isImage ? "image" : "text",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);
    setIsLoading(true);

    try {
      if (isImage && selectedImage) {
        // 画像検出処理
        const imageResult = await detectImage(selectedImage);
        console.log(imageResult);
        const apiContent = imageResult.image;
        const assistantMessage: ChatMessage = {
          id: generateUUID(),
          role: "assistant",
          content: apiContent,
          type: "image",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsThinking(false);
      setIsLoading(false);
      setSelectedImage(null);
    }
  };

  const addTip = () => {
    if (!input.trim() || !latestTipsMessage) return;

    const newTip = input.trim();
    if (latestTipsMessage.tips?.includes(newTip)) return;

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === latestTipsMessage.id
          ? {
              ...msg,
              tips: [...(msg.tips || []), newTip],
              selectedTips: [...(msg.selectedTips || []), newTip],
            }
          : msg
      )
    );
    setInput("");
  };

  const removeTip = (messageId: string, tipToRemove: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              tips: msg.tips?.filter((tip) => tip !== tipToRemove),
              selectedTips: msg.selectedTips?.filter(
                (tip) => tip !== tipToRemove
              ),
            }
          : msg
      )
    );
  };

  const toggleTipSelection = (messageId: string, tip: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              selectedTips: msg.selectedTips?.includes(tip)
                ? msg.selectedTips.filter((t) => t !== tip)
                : [...(msg.selectedTips || []), tip],
            }
          : msg
      )
    );
  };

  const selectAllTips = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, selectedTips: [...(msg.tips || [])] }
          : msg
      )
    );
  };

  const deselectAllTips = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, selectedTips: [] } : msg
      )
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "ask") {
      if (selectedImage) {
        await sendMessage("", true);
      } else {
        await sendMessage(input);
      }
    } else if (mode === "query") {
      if (!latestTipsMessage?.selectedTips?.length) return;

      try {
        const recipes = await fetchRecipes(latestTipsMessage.selectedTips);
        console.log("検索結果:", recipes);
        setMode("selection");
      } catch (error) {
        console.error("レシピ検索エラー:", error);
      }
    }
  };

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
        return `検索 (${latestTipsMessage?.selectedTips?.length || 0}個選択)`;
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
          <div key={message.id}>
            <Message
              message={message}
              removeTip={removeTip}
              toggleTipSelection={toggleTipSelection}
            />

            {/* Tips表示 */}
            {message.type === "tips" && message.tips && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-blue-700 font-medium">
                    提案: ({message.selectedTips?.length || 0}/
                    {message.tips.length}個選択)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectAllTips(message.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      全選択
                    </button>
                    <button
                      onClick={() => deselectAllTips(message.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      全解除
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {message.tips.map((tip, index) => {
                    const isSelected =
                      message.selectedTips?.includes(tip) || false;
                    return (
                      <div
                        key={`${tip}-${index}`}
                        className={`flex items-center gap-1 px-3 py-1 text-sm rounded-full border transition-colors duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-blue-200 border-blue-400 text-blue-900"
                            : "bg-blue-100 border-blue-300 text-blue-800"
                        }`}
                        onClick={() => toggleTipSelection(message.id, tip)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500 focus:ring-2 pointer-events-none"
                        />
                        <span className="flex-1 text-left">{tip}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTip(message.id, tip);
                          }}
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
          </div>
        ))}

        {isThinking && <Thinking />}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleFormSubmit} className="flex space-x-4">
          <div className="flex-1 relative max-w-full">
            {selectedImage ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mx-auto">
                <img
                  src={selectedImage}
                  alt="Selected"
                  className="max-h-32 mx-auto rounded"
                />
                <p className="text-sm text-gray-500 text-center mt-2">
                  画像が選択されました
                </p>
              </div>
            ) : mode === "ask" ? (
              <div
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = e.dataTransfer.files;
                  if (files && files[0]) {
                    const file = files[0];
                    if (file.type.startsWith("image/")) {
                      handleFileInput(file);
                    }
                  }
                }}
              >
                <div className="text-center">
                  <p className="text-gray-500">画像をドラッグ&ドロップ</p>
                  <p className="text-sm text-gray-400">または</p>
                  <button
                    type="button"
                    className="mt-2 px-4 py-2 text-sm text-blue-500 hover:text-blue-600"
                    onClick={() => {
                      const fileInput = document.createElement("input");
                      fileInput.type = "file";
                      fileInput.accept = "image/*";
                      fileInput.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          handleFileInput(file);
                        }
                      };
                      fileInput.click();
                    }}
                  >
                    ファイルを選択
                  </button>
                </div>
              </div>
            ) : (
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
            )}
          </div>

          {mode === "query" && !selectedImage && (
            <button
              type="button"
              disabled={!input.trim() || isLoading || isThinking}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={addTip}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={
              mode === "query"
                ? (latestTipsMessage?.selectedTips?.length || 0) === 0 ||
                  isLoading ||
                  isThinking
                : (!input.trim() && !selectedImage) || isLoading || isThinking
            }
            className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center ${
              selectedImage && "w-[100px]"
            }`}
          >
            {getButtonText()}
          </button>
        </form>
      </div>
    </div>
  );
}
