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
  // 料理に関連するキーワードに基づいて適切な回答を生成
  const message = userMessage.toLowerCase();

  if (message.includes("レシピ") || message.includes("作り方")) {
    return `${userMessage}についてのレシピをご紹介しますね！

**材料（2-3人分）：**
• 主要な食材
• 調味料
• その他の材料

**作り方：**
1. **下準備**: 食材を適切なサイズに切り、必要に応じて下茹でします
2. **調理**: 適切な温度と時間で調理します
3. **味付け**: バランスよく調味料を加えます
4. **仕上げ**: 盛り付けて完成です

**ポイント：**
• 食材の新鮮さが重要です
• 火加減に注意しましょう
• 味見をしながら調整してください

何か他にご質問がございましたら、お気軽にお聞きください！`;
  }

  if (message.includes("栄養") || message.includes("健康")) {
    return `${userMessage}の栄養面についてお答えしますね！

**主な栄養素：**
• **タンパク質**: 筋肉や体の組織を作る重要な栄養素
• **ビタミン**: 体の機能を正常に保つために必要
• **ミネラル**: 骨や歯の健康に重要
• **食物繊維**: 腸内環境を整える効果

**健康効果：**
• 免疫力向上
• 疲労回復
• 美肌効果
• 生活習慣病予防

バランスの良い食事を心がけることが大切ですね。他にも栄養について知りたいことがあれば、お聞かせください！`;
  }

  if (message.includes("食材") || message.includes("選び方")) {
    return `${userMessage}の選び方についてアドバイスいたします！

**良い食材の見分け方：**
• **見た目**: 色つやが良く、傷みがないもの
• **香り**: 新鮮な香りがするもの
• **触感**: 適度な弾力があるもの
• **季節**: 旬の時期のものを選ぶ

**保存方法：**
• 適切な温度で保存
• 湿度に注意
• 空気に触れないよう密閉

**調理のコツ：**
• 食材の特性を活かした調理法を選ぶ
• 下処理を丁寧に行う
• 火の通り方に注意

新鮮で質の良い食材を使うことで、料理の味が格段に向上しますよ！`;
  }

  // デフォルトの回答
  return `${userMessage}についてお答えしますね！

料理は創造性と技術の組み合わせです。以下のポイントを参考にしてください：

**基本のポイント：**
• **計画**: まずはどんな料理を作りたいか明確にしましょう
• **準備**: 必要な食材と調理器具を揃えます
• **手順**: レシピに従って段階的に進めます
• **調整**: 味見をしながら好みに合わせて調整します

**上達のコツ：**
• 基本的な調理技術を身につける
• 様々な料理に挑戦してみる
• 失敗を恐れずに実験する
• 美味しい料理を食べて味覚を鍛える

料理は楽しみながら作ることが一番大切です。何か具体的にお聞きしたいことがあれば、遠慮なくお聞かせください！`;
}
