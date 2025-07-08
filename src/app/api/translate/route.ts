import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { instructions } = body;

    const response = await fetch("http://localhost:5000/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ instructions }),
    });

    if (!response.ok) {
      throw new Error("翻訳APIのリクエストに失敗しました");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("翻訳エラー:", error);
    return NextResponse.json(
      { error: "翻訳処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
