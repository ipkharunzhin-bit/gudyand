"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Order } from "@/types";
import { ArrowLeft, ShoppingBag, Search } from "lucide-react";

export default function OrdersPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadOrders();
  }, [shopId]);

  async function loadOrders() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/orders?shop_id=${shopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter(
    (o) =>
      o.order_id_ym.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer_email.toLowerCase().includes(search.toLowerCase())
  );

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
            <h1 className="text-lg font-bold">История заказов</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">
            {error}
          </p>
        )}

        <div className="card mb-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
              placeholder="Поиск по ID заказа или email покупателя..."
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">
              {orders.length === 0
                ? "Заказов пока нет. Они появятся после первой автоматической отправки."
                : "Ничего не найдено"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="card flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <p className="font-medium text-sm">
                    Заказ #{order.order_id_ym}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {order.buyer_email}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {order.total_keys} ключей
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    {order.status === "PROCESSING"
                      ? "Отправлен"
                      : order.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleDateString(
                      "ru-RU",
                      {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}