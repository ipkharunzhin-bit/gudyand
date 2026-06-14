import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { signToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email и пароль обязательны" },
        { status: 400 }
      );
    }

    const { data: user, error: findError } = await supabaseAdmin
      .from("users")
      .select("id, email, password_hash, confirmed_at")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (findError || !user) {
      return NextResponse.json(
        { error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    if (!user.confirmed_at) {
      return NextResponse.json(
        { error: "Email не подтверждён. Проверьте почту" },
        { status: 403 }
      );
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json(
        { error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    const token = signToken({ userId: user.id, email: user.email });

    return NextResponse.json({ token, email: user.email });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}