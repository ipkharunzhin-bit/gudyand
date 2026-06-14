"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка входа");
      }

      // Сохраняем токен
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-sm card">
        <h2 className="text-xl font-bold">Войти</h2>
        <p className="mt-1 text-sm text-gray-500">
          Войдите в аккаунт для управления магазином
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field mt-1"
              placeholder="Введите пароль"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-medium text-black underline">
            Регистрация
          </Link>
        </p>
      </div>
    </div>
  );
}