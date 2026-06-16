"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ProductKey, Product } from "@/types";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Wand2,
  Save,
} from "lucide-react";

export default function ProductKeysPage() {
  const { shopId, productId } = useParams<{
    shopId: string;
    productId: string;
  }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [keys, setKeys] = useState<ProductKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  // Форма добавления ключей
  const [inputText, setInputText] = useState("");
  const [instruction, setInstruction] = useState("");

  // Генерация
  const [generateCount, setGenerateCount] = useState(10);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadKeys();
  }, [productId]);

  async function loadKeys() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/products/keys?product_id=${productId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProduct(data.product);
      setKeys(data.keys || []);
      setInstruction(data.product?.instruction || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  // Добавить ключи из текста (каждая строка — ключ)
  async function addFromText() {
    const codes = inputText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (codes.length === 0) {
      setError("Введите хотя бы один ключ");
      return;
    }

    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/products/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: productId, codes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInputText("");
      showSuccess(`Добавлено ключей: ${data.added}`);
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  // Загрузить из TXT файла
  async function addFromFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setInputText(text);
    e.target.value = "";
  }

  // Сгенерировать случайные ключи
  async function generateKeys() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const codes: string[] = [];

    for (let i = 0; i < generateCount; i++) {
      let code = "";
      for (let j = 0; j < 15; j++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      codes.push(code);
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/products/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: productId, codes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showSuccess(`Сгенерировано ключей: ${data.added}`);
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  // Удалить ключ
  async function deleteKey(keyId: string) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/products/keys?key_id=${keyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showSuccess("Ключ удалён");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  // Сохранить инструкцию
  async function saveInstruction() {
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/products?id=${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: productId, instruction }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showSuccess("Инструкция сохранена");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  // Удалить товар со всеми ключами
  async function deleteProduct() {
    if (
      !confirm("Удалить товар и все ключи? Это действие необратимо.")
    )
      return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/products?id=${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(`/dashboard/${shopId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  const availableKeys = keys.filter((k) => k.status === "available");
  const sentKeys = keys.filter((k) => k.status === "sent");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/${shopId}`}
              className="text-gray-400 hover:text-black transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">{product?.name}</h1>
              <p className="text-xs text-gray-400">
                offer_id: {product?.offer_id}
              </p>
            </div>
          </div>
          <button onClick={deleteProduct} className="btn-danger text-xs">
            <Trash2 className="mr-1 h-3 w-3" />
            Удалить товар
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 text-sm text-green-600 bg-green-50 rounded-lg p-3">
            {success}
          </p>
        )}

        {/* Инструкция */}
        <div className="card mb-6">
          <h3 className="font-medium mb-2">Инструкция для покупателя</h3>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            className="input-field mb-2"
            placeholder="Как активировать ключ..."
          />
          <button onClick={saveInstruction} className="btn-secondary text-xs">
            <Save className="mr-1 h-3 w-3" />
            Сохранить инструкцию
          </button>
        </div>

        {/* Статистика ключей */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card">
            <p className="text-2xl font-bold">{availableKeys.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Доступно</p>
          </div>
          <div className="card">
            <p className="text-2xl font-bold">{sentKeys.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Отправлено</p>
          </div>
        </div>

        {/* Добавление ключей */}
        <div className="card mb-6">
          <h3 className="font-medium mb-3">Добавить ключи</h3>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={5}
            className="input-field mb-3 font-mono text-xs"
            placeholder="Вставьте ключи, каждый с новой строки..."
          />
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={addFromText}
              className="btn-primary text-xs flex-1"
            >
              <Plus className="mr-1 h-3 w-3" />
              Добавить
            </button>
            <label className="btn-secondary text-xs cursor-pointer flex-1 text-center">
              <Upload className="mr-1 h-3 w-3 inline" />
              Загрузить TXT
              <input
                type="file"
                accept=".txt,.csv"
                onChange={addFromFile}
                className="hidden"
              />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={generateCount}
                onChange={(e) =>
                  setGenerateCount(parseInt(e.target.value) || 10)
                }
                className="input-field w-16 text-center text-xs"
                min={1}
                max={1000}
              />
              <button
                onClick={generateKeys}
                className="btn-secondary text-xs"
              >
                <Wand2 className="mr-1 h-3 w-3" />
                Сгенерировать
              </button>
            </div>
          </div>
        </div>

        {/* Список ключей */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Все ключи ({keys.length})</h3>
            {availableKeys.length > 0 && (
              <button
                onClick={async () => {
                  if (!confirm(`Удалить все ${availableKeys.length} доступных ключей?`)) return;
                  const token = localStorage.getItem("token");
                  for (const k of availableKeys) {
                    await fetch(`/api/products/keys?key_id=${k.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                  }
                  setKeys((prev) => prev.filter((k) => k.status !== "available"));
                }}
                className="btn-danger text-xs"
              >
                <Trash2 className="mr-1 h-3 w-3" />Удалить все доступные ({availableKeys.length})
              </button>
            )}
          </div>
          <div className="max-h-[500px] overflow-y-auto space-y-1">
            {keys.map((key) => (
              <div
                key={key.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                  key.status === "sent"
                    ? "bg-gray-50 text-gray-400"
                    : "bg-white border border-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      key.status === "available"
                        ? "bg-green-500"
                        : "bg-gray-300"
                    }`}
                  />
                  <span className="font-mono">{key.code}</span>
                  {key.status === "sent" && (
                    <span className="text-gray-400">
                      • отправлен{" "}
                      {key.sent_at
                        ? new Date(key.sent_at).toLocaleDateString(
                            "ru-RU"
                          )
                        : ""}
                    </span>
                  )}
                </div>
                {key.status === "available" && (
                  <button
                    onClick={() => deleteKey(key.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}

            {keys.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">
                Нет ключей. Добавьте вручную, загрузите из файла или
                сгенерируйте.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}