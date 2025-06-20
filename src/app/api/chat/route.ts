export async function POST(request: Request) {
  const { message } = await request.json();

  // ストリーミングレスポンスを作成
  const stream = new ReadableStream({
    start(controller) {
      // 擬似的なClaude回答を段階的に送信
      const mockResponse = `こんにちは！${message}について回答させていただきますね。

まず、この問題について考えてみましょう。いくつかのポイントがあります：

1. **基本的なアプローチ**
   - 問題を整理して、段階的に解決していく必要があります
   - 各ステップで確認しながら進めることが重要です

2. **具体的な方法**
   - 実際の実装では、まず設計を考える
   - その後、段階的に機能を追加していく
   - テストを行いながら品質を確保する

3. **注意点**
   - エラーハンドリングを忘れずに
   - ユーザビリティを考慮する
   - パフォーマンスにも配慮する

以上のようなアプローチで進めることをお勧めします。何か他にご質問がございましたらお気軽にお聞きください！`;

      // 文字を1つずつ段階的に送信
      const words = mockResponse.split("");
      let index = 0;

      const interval = setInterval(() => {
        if (index < words.length) {
          controller.enqueue(
            new TextEncoder().encode(
              JSON.stringify({ content: words[index] }) + "\n"
            )
          );
          index++;
        } else {
          controller.enqueue(
            new TextEncoder().encode(JSON.stringify({ done: true }) + "\n")
          );
          controller.close();
          clearInterval(interval);
        }
      }, 50); // 50msごとに1文字ずつ送信
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
