"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка регистрации");
      }

      setSuccess(true);
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
          <h2 className="text-xl font-bold">Проверьте почту</h2>
          <p className="mt-3 text-sm text-gray-500">
            Мы отправили код подтверждения на <strong>{email}</strong>.
            Перейдите по ссылке в письме.
          </p>
          <Link href="/login" className="btn-primary mt-6">
            Перейти ко входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-sm card">
        <h2 className="text-xl font-bold">Регистрация</h2>
        <p className="mt-1 text-sm text-gray-500">
          Создайте аккаунт для управления магазином
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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
            <label className="text-sm font-medium">Пароль</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field mt-1"
              placeholder="Минимум 6 символов"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-medium text-black underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}