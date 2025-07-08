"use client";

import { Send, Bot } from "lucide-react";
import { useState, useEffect, useRef } from "react";

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
  return (await response.json()).results.filter(
    (value: any, index: number, orig: any) => {
      return (
        orig.findIndex((t: any) => t.recipe_image === value.recipe_image) ===
        index
      );
    }
  );
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
  return response;
};

const getRankedRecipes = async (
  recipes: any[],
  allergies: string[],
  preference: string
) => {
  const response = await fetch("/api/rank", {
    method: "POST",
    body: JSON.stringify({ recipes, allergies, preference }),
  });
  return (await response.json()).ranked_recipes;
};

const translateInstructions = async (instructions: string[]) => {
  const response = await fetch("/api/translate", {
    method: "POST",
    body: JSON.stringify({ instructions }),
  });
  return (await response.json()).translated_instructions;
};

const processIngredients = async (
  image_url: string,
  addMessages: (message: ChatMessage) => void,
  updateMessage: (message: ChatMessage) => void,
  setIsThinking: (isThinking: boolean) => void
) => {
  setIsThinking(true);
  const response = await getIngredients(image_url);

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let assistantContent = "";

  const assistantMessage: ChatMessage = {
    id: generateUUID(),
    content: "",
    role: "assistant",
    type: "tips",
    tips: [],
    selectedTips: [],
    timestamp: new Date(),
  };

  const enJpMap: { [key: string]: string } = {};

  setIsThinking(false);

  addMessages(assistantMessage);

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      assistantContent += chunk;

      const listItems = assistantContent
        .split("\n")
        .filter((line) => line.trim().startsWith("- "))
        .map((line) => {
          const trimmed = line.trim();
          return trimmed.slice(2);
        })
        .filter((line) => line.split("/").length === 2)
        .map((line) => {
          const [en, jp] = line.split("/").map((el) => el.trim());
          enJpMap[en] = jp;
          return en;
        })
        // to be unique
        .filter((value, index, self) => self.indexOf(value) === index)
        .filter((value) => !value.toLowerCase().includes("unknown"));

      if (listItems.length > 0) {
        assistantMessage.tips = listItems;
        assistantMessage.selectedTips = listItems;
        updateMessage(assistantMessage);
      }
    }
  }
  return enJpMap;
};

const generateUUID = () => {
  return crypto.randomUUID();
};

// 確認モーダルコンポーネント
function ImageConfirmModal({
  imageUrl,
  onConfirm,
  onCancel,
}: {
  imageUrl: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Do you want to send this image?
        </h3>

        <div className="mb-4">
          <img
            src={imageUrl}
            alt="選択された画像"
            className="w-full max-h-64 object-contain rounded border"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"ask" | "query" | "selection">("ask");
  const [isComposition, setIsComposition] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [enJpMap, setEnJpMap] = useState<{ [key: string]: string }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [allergies, setAllergies] = useState<string[]>([]);

  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollTo({
          top: messagesEndRef.current.clientHeight,
          behavior: "smooth",
        });
      }
    };

    scrollToBottom();
  }, [messages]);

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
      setShowImageModal(true);
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (
    messageContent: string,
    isImage = false
  ): Promise<ChatMessage | undefined> => {
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
    setIsLoading(true);
    let assistantMessage: ChatMessage | undefined;

    try {
      if (isImage && selectedImage) {
        // 画像検出処理
        const imageResult = await detectImage(selectedImage);
        const apiContent = imageResult.image;
        assistantMessage = {
          id: generateUUID(),
          role: "assistant",
          content: apiContent,
          type: "image",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage as ChatMessage]);
        setMode("query");
      } else {
        // テキストメッセージの処理（必要に応じて実装）
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
    }
    return assistantMessage;
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

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsThinking(true);
    if (!latestTipsMessage?.selectedTips?.length) return;
    try {
      const recipes = await fetchRecipes(
        latestTipsMessage.selectedTips.map((tip) => enJpMap[tip])
      );
      console.log(recipes);
      const rankedRecipeRes = await getRankedRecipes(
        recipes.slice(0, 50),
        allergies,
        input
      );
      console.log(rankedRecipeRes);
      setIsThinking(false);
      const rankedRecipeLists = recipes
        .filter((recipe: any) =>
          rankedRecipeRes
            .map((res: any) => res.recipe_name)
            .includes(recipe.recipe_name)
        )
        .map((r: any) => ({
          ...r,
          recipe_name_en: rankedRecipeRes.find(
            (res: any) => res.recipe_name === r.recipe_name
          )?.recipe_name_en,
        }));

      const assistantMessage: ChatMessage = {
        id: generateUUID(),
        role: "assistant",
        content: "",
        type: "recipes",
        recipes: rankedRecipeLists,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      console.log("検索結果:", recipes);
      setInput("");
      setMode("selection");
    } catch (error) {
      console.error("レシピ検索エラー:", error);
    }
  };

  const handleSelect = async (recipeName: string) => {
    const recipes = messages.filter((m) => m.type === "recipes")[0].recipes;
    if (!recipes) return;
    setIsThinking(true);
    const selectedRecipe = recipes.find(
      (recipe: any) => recipe.recipe_name === recipeName
    );
    if (!selectedRecipe) return;
    const translatedInstructions = await translateInstructions(
      selectedRecipe.instructions.map((inst: any) => inst.text)
    );
    setIsThinking(false);
    selectedRecipe.instructions.forEach((inst: any, i: number) => {
      const assistantMessage: ChatMessage = {
        id: generateUUID(),
        role: "assistant",
        content: `${i + 1}. ${translatedInstructions[i]}`,
        type: "text",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (inst.image) {
        const imageMessage: ChatMessage = {
          id: generateUUID(),
          role: "assistant",
          content: inst.image,
          type: "image",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, imageMessage]);
      }
    });
    setMode("ask");
  };

  const handleImageConfirm = async () => {
    setIsThinking(true);
    setShowImageModal(false);
    const inputImage = selectedImage!;
    const detectedMessage = await sendMessage("", true);
    setIsThinking(false);
    if (!detectedMessage) return;
    const _enJpMap = await processIngredients(
      // detectedMessage.content,
      inputImage,
      (message) => setMessages((prev) => [...prev, message]),
      (message) => setMessages((prev) => [...prev.slice(0, -1), message]),
      setIsThinking
    );
    setEnJpMap(_enJpMap);
  };

  const handleImageCancel = () => {
    setShowImageModal(false);
    setSelectedImage(null);
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
      <div
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        ref={messagesEndRef}
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Ask me anything about cooking!</p>
            <p className="text-sm mt-2 text-gray-400">
              I will help you with recipes, cooking methods, and food selection.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            <Message
              message={message}
              removeTip={removeTip}
              toggleTipSelection={toggleTipSelection}
              handleSelect={handleSelect}
            />
          </div>
        ))}

        {isThinking && <Thinking />}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleQuery} className="flex space-x-4">
          <div className="flex-1 relative max-w-full">
            {mode === "ask" && (
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
                  <p className="text-gray-500">Drag & Drop Image</p>
                  <p className="text-sm text-gray-400">Or</p>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm text-blue-500 hover:text-blue-600 cursor-pointer"
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
                    Select File
                  </button>
                </div>
              </div>
            )}
            {mode === "query" && (
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isComposition) {
                    e.preventDefault();
                    handleQuery(e);
                  }
                }}
                onCompositionStart={() => setIsComposition(true)}
                onCompositionEnd={() => setIsComposition(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={1}
                disabled={isLoading || isThinking}
              />
            )}
          </div>

          {mode === "query" && (
            <button
              type="button"
              disabled={!input.trim() || isLoading || isThinking}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={addTip}
            >
              Add Tip
            </button>
          )}

          {mode === "query" && (
            <button
              type="submit"
              disabled={
                (latestTipsMessage?.selectedTips?.length || 0) === 0 ||
                isLoading ||
                isThinking
              }
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {`Search (${
                latestTipsMessage?.selectedTips?.length || 0
              } selected)`}
            </button>
          )}
        </form>
      </div>

      {/* Image Confirm Modal */}
      {showImageModal && selectedImage && (
        <ImageConfirmModal
          imageUrl={selectedImage}
          onConfirm={handleImageConfirm}
          onCancel={handleImageCancel}
        />
      )}
    </div>
  );
}
