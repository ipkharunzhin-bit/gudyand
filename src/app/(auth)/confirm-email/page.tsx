"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ConfirmEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get("email") || "";
  const codeParam = searchParams.get("code") || "";

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState(codeParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Если есть и email, и code в URL — авто-подтверждение
    if (emailParam && codeParam) {
      handleConfirm(emailParam, codeParam);
    }
  }, [emailParam, codeParam]);

  async function handleConfirm(e?: string, c?: string) {
    const confirmEmail = e || email;
    const confirmCode = c || code;

    if (!confirmEmail || !confirmCode) {
      setError("Введите email и код");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: confirmEmail, code: confirmCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка подтверждения");
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-sm card text-center">
          <h2 className="text-xl font-bold">Email подтверждён!</h2>
          <p className="mt-3 text-sm text-gray-500">
            Сейчас перенаправим на страницу входа...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-sm card">
        <h2 className="text-xl font-bold">Подтверждение email</h2>
        <p className="mt-1 text-sm text-gray-500">
          Введите email и код из письма
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field mt-1"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Код подтверждения</label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="input-field mt-1"
              placeholder="123456"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={() => handleConfirm()}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Проверяем..." : "Подтвердить"}
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-black underline">
            Вернуться ко входу
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-500">Загрузка...</p>
      </div>
    }>
      <ConfirmEmailForm />
    </Suspense>
  );
}