import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { recipes, allergies, preference } = await request.json();

    const response = await fetch("http://localhost:5000/rank", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipes,
        allergies,
        preference,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in rank API:", error);
    return NextResponse.json(
      { error: "ランキングの取得に失敗しました" },
      { status: 500 }
    );
  }
}
