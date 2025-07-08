import { Bot, User, X } from "lucide-react";
import { ChatMessage } from "./type";

export function Message({
  message,
  removeTip,
  toggleTipSelection,
}: {
  message: ChatMessage;
  removeTip: (id: string, tip: string) => void;
  toggleTipSelection: (id: string, tip: string) => void;
}) {
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
          className={`px-4 py-2 rounded-lg w-[100%] ${
            message.role === "user"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-800 border border-gray-200"
          }`}
        >
          {message.type === "tips" && (
            <>
              {/* Tips */}
              {message.content.length > 0 && (
                <div className="bg-blue-50 border-t border-blue-200 px-6 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-blue-700 font-medium">
                      提案: ({message.selectedTips?.length}/
                      {message.tips?.length}
                      個選択)
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          message.tips
                            ?.filter(
                              (tip: string) =>
                                !message.selectedTips?.includes(tip)
                            )
                            .forEach((tip: string) => {
                              toggleTipSelection(message.id, tip);
                            });
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        全選択
                      </button>
                      <button
                        onClick={() =>
                          message.selectedTips?.forEach((tip: string) =>
                            toggleTipSelection(message.id, tip)
                          )
                        }
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        全解除
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {message.tips?.map((tip: string, index: number) => {
                      const isSelected = message.selectedTips?.includes(tip);
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
                            onChange={() => {}} // 空の関数にして、親のonClickで処理
                            className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500 focus:ring-2 pointer-events-none"
                          />
                          <span className="flex-1 text-left">{tip}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // 親のonClickを防ぐ
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
            </>
          )}
          {message.type === "text" && (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
          {message.type === "image" && (
            <div className="w-full">
              <img
                src={message.content}
                alt="Selected"
                className="max-h-32 mx-auto rounded"
              />
            </div>
          )}

          {message.type === "recipe" && (
            <div className="w-full">
              <div className="flex overflow-x-auto gap-4 no-wrap">
                {message.recipes?.slice(0, 3).map((candidate: any) => (
                  <div
                    className="flex-none w-64 p-4 bg-white rounded-lg shadow-md mr-4"
                    key={candidate._id}
                  >
                    <img
                      src={`https://placehold.co/400x300/e2e8f0/1e293b`}
                      alt={candidate.recipe_name}
                      className="w-full h-40 object-cover rounded-md mb-3"
                    />
                    <h3 className="text-lg font-medium text-gray-900 min-h-[3rem] line-clamp-2">
                      {candidate.recipe_name}
                    </h3>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div
            className={`text-xs mt-1 ${
              message.role === "user" ? "text-blue-100" : "text-gray-500"
            }`}
          >
            {message.timestamp.toLocaleTimeString() ||
              new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
