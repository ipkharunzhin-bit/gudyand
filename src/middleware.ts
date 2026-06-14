import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Простейший in-memory rate limiter (для прода — использовать Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "5");
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000");

export function middleware(request: NextRequest) {
  // CSP-заголовки для защиты от XSS
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js требует unsafe-eval
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.partner.market.yandex.ru https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", cspHeader);
  requestHeaders.set("X-Content-Type-Options", "nosniff");
  requestHeaders.set("X-Frame-Options", "DENY");
  requestHeaders.set("X-XSS-Protection", "1; mode=block");
  requestHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Rate limiting для auth эндпоинтов
  if (
    request.nextUrl.pathname.startsWith("/api/auth/login") ||
    request.nextUrl.pathname.startsWith("/api/auth/register")
  ) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    } else if (record.count >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте позже." },
        {
          status: 429,
          headers: requestHeaders,
        }
      );
    } else {
      record.count++;
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Применяем middleware только к API и страницам
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|file.svg|globe.svg|next.svg|vercel.svg|window.svg).*)",
  ],
};