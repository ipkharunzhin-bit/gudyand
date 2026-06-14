import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { sendConfirmationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email и пароль обязательны" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен быть не менее 6 символов" },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Генерируем 6-значный код подтверждения
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Создаём пользователя
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      confirmation_code: confirmationCode,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Ошибка создания пользователя" },
        { status: 500 }
      );
    }

    // Отправляем письмо с кодом
    await sendConfirmationEmail(email, confirmationCode);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}