"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shop } from "@/types";
import { Plus, Store } from "lucide-react";

export default function DashboardPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  // Новый магазин
  const [showAdd, setShowAdd] = useState(false);
  const [shopName, setShopName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadShops(token);
  }, []);

  async function loadShops(token: string) {
    try {
      const res = await fetch("/api/shops", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShops(data.shops);
      setUserEmail(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function addShop(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: shopName,
          business_id: parseInt(businessId),
          api_key: apiKey,
          campaign_id: parseInt(campaignId),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShops([...shops, data.shop]);
      setShowAdd(false);
      setShopName("");
      setBusinessId("");
      setApiKey("");
      setCampaignId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-500">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold">Мои магазины</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-black transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              href={`/dashboard/${shop.id}`}
              className="card hover:border-gray-300 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                  <Store className="h-5 w-5 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium truncate">{shop.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    ID: {shop.business_id}
                  </p>
                </div>
              </div>
            </Link>
          ))}

          <button
            onClick={() => setShowAdd(true)}
            className="card hover:border-gray-300 transition-all flex flex-col items-center justify-center gap-2 min-h-[100px] text-gray-400 hover:text-black"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm">Добавить магазин</span>
          </button>
        </div>

        {shops.length === 0 && (
          <div className="text-center py-16">
            <Store className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">
              Нет подключённых магазинов
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="btn-primary mt-4"
            >
              Подключить магазин
            </button>
          </div>
        )}
      </div>

      {/* Модальное окно добавления магазина */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-bold">Подключить магазин</h2>
            <p className="mt-1 text-sm text-gray-500">
              Введите данные из кабинета Яндекс Маркета
            </p>

            <form onSubmit={addShop} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium">Название</label>
                <input
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="input-field mt-1"
                  placeholder="Мой магазин"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Business ID</label>
                <input
                  type="number"
                  required
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  className="input-field mt-1"
                  placeholder="12345678"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Campaign ID</label>
                <input
                  type="number"
                  required
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="input-field mt-1"
                  placeholder="22345678"
                />
              </div>
              <div>
                <label className="text-sm font-medium">API ключ (Api-Key)</label>
                <input
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="input-field mt-1"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? "Сохраняем..." : "Подключить"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}