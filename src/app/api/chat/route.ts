// 純粋なServer-Sent Events (SSE) 実装

export async function POST(req: Request) {
  console.log("Chat API called");

  const { messages } = await req.json();
  console.log("Received messages:", messages);

  try {
    // 最新のユーザーメッセージを取得
    const lastUserMessage = messages
      .filter((m: any) => m.role === "user")
      .pop();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockResponse = generateCookingResponse(
      lastUserMessage?.content || ""
    );

    console.log("Generated response:", mockResponse.substring(0, 100) + "...");

    // Server-Sent Events (SSE) 形式でストリーミング
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        let index = 0;
        let isClosed = false;
        const chars = mockResponse.split("");

        const sendNext = () => {
          // コントローラーが閉じられている場合は処理を停止
          if (isClosed) {
            console.log("Controller is closed, stopping stream");
            return;
          }

          try {
            if (index < chars.length) {
              const char = chars[index];
              // Vercel AI SDK互換のデータストリーム形式
              const chunk =
                `0:"${char.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"` + "\n";
              controller.enqueue(encoder.encode(chunk));
              index++;
              setTimeout(sendNext, 30);
            } else {
              // 完了シグナル - Vercel AI SDK形式
              const finishChunk =
                `d:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":${mockResponse.length}}}` +
                "\n";
              controller.enqueue(encoder.encode(finishChunk));
              isClosed = true;
              controller.close();
              console.log("Streaming completed");
            }
          } catch (error) {
            console.error("Error during streaming:", error);
            isClosed = true;
            try {
              controller.close();
            } catch (closeError) {
              console.error("Error closing controller:", closeError);
            }
          }
        };

        sendNext();
      },
      cancel() {
        console.log("Stream cancelled by client");
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Error in streaming:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function generateCookingResponse(userMessage: string): string {
  return `- 玉ねぎ
- お米
- おかず
- 汁物
- デザート
- お酒
- お茶`;
}
