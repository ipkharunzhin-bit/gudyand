import { NextRequest, NextResponse } from "next/server";

// Отладочный эндпоинт — возвращает время последнего деплоя
// Так мы точно узнаем, какая версия кода на сервере
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    deployed_at: new Date().toISOString(),
    commit: "b328c39",
    message: "Если видишь это сообщение — деплой свежий",
  });
}