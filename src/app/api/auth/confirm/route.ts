import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email и код обязательны" },
        { status: 400 }
      );
    }

    // Ищем пользователя
    const { data: user, error: findError } = await supabaseAdmin
      .from("users")
      .select("id, confirmation_code, confirmed_at")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (findError || !user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    if (user.confirmed_at) {
      return NextResponse.json({
        success: true,
        message: "Email уже подтверждён",
      });
    }

    if (user.confirmation_code !== code) {
      return NextResponse.json(
        { error: "Неверный код подтверждения" },
        { status: 400 }
      );
    }

    // Подтверждаем email
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        confirmed_at: new Date().toISOString(),
        confirmation_code: null,
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Ошибка подтверждения" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Confirm error:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}