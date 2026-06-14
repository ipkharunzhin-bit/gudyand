"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";

interface StatsData {
  totalKeysSold: number;
  totalRevenue: number;
  ordersCount: number;
  byDay: { date: string; sold: number; revenue: number }[];
  byWeek: { week: string; sold: number; revenue: number }[];
  byMonth: { month: string; sold: number; revenue: number }[];
}

export default function StatsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"day" | "week" | "month">("day");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadStats();
  }, [shopId]);

  async function loadStats() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/orders?shop_id=${shopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const orders = data.orders || [];
      computeStats(orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  function computeStats(orders: { total_keys: number; created_at: string }[]) {
    const totalKeysSold = orders.reduce(
      (sum: number, o: { total_keys: number }) => sum + o.total_keys,
      0
    );
    const ordersCount = orders.length;
    // Выручка = кол-во ключей * средняя цена (у нас нет цен, оценим как 0)
    const totalRevenue = 0;

    // Группировка по дням
    const dayMap: Record<string, { sold: number; revenue: number }> = {};
    orders.forEach((o: { total_keys: number; created_at: string }) => {
      const day = new Date(o.created_at).toLocaleDateString("ru-RU");
      if (!dayMap[day]) dayMap[day] = { sold: 0, revenue: 0 };
      dayMap[day].sold += o.total_keys;
    });
    const byDay = Object.entries(dayMap)
      .map(([date, val]) => ({ date, ...val }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // По неделям
    const weekMap: Record<string, { sold: number; revenue: number }> = {};
    orders.forEach((o: { total_keys: number; created_at: string }) => {
      const d = new Date(o.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      const week = weekStart.toLocaleDateString("ru-RU");
      if (!weekMap[week]) weekMap[week] = { sold: 0, revenue: 0 };
      weekMap[week].sold += o.total_keys;
    });
    const byWeek = Object.entries(weekMap)
      .map(([week, val]) => ({ week, ...val }))
      .sort((a, b) => b.week.localeCompare(a.week));

    // По месяцам
    const monthMap: Record<string, { sold: number; revenue: number }> = {};
    orders.forEach((o: { total_keys: number; created_at: string }) => {
      const month = new Date(o.created_at).toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      });
      if (!monthMap[month]) monthMap[month] = { sold: 0, revenue: 0 };
      monthMap[month].sold += o.total_keys;
    });
    const byMonth = Object.entries(monthMap)
      .map(([month, val]) => ({ month, ...val }))
      .sort(
        (a, b) =>
          new Date(b.month).getTime() - new Date(a.month).getTime()
      );

    setStats({ totalKeysSold, totalRevenue, ordersCount, byDay, byWeek, byMonth });
  }

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
            <h1 className="text-lg font-bold">Статистика</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">
            {error}
          </p>
        )}

        {!stats ? (
          <div className="text-center py-16">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">
              Нет данных для отображения
            </p>
          </div>
        ) : (
          <>
            {/* Главные показатели */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="card">
                <p className="text-2xl font-bold">
                  {stats.totalKeysSold}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Продано ключей
                </p>
              </div>
              <div className="card">
                <p className="text-2xl font-bold">
                  {stats.ordersCount}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Заказов</p>
              </div>
            </div>

            {/* Табы */}
            <div className="flex gap-1 mb-4">
              {(["day", "week", "month"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm rounded-lg transition-all ${
                    tab === t
                      ? "bg-black text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {t === "day"
                    ? "По дням"
                    : t === "week"
                    ? "По неделям"
                    : "По месяцам"}
                </button>
              ))}
            </div>

            {/* Таблица */}
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="pb-3 font-medium text-gray-500">
                      {tab === "day"
                        ? "Дата"
                        : tab === "week"
                        ? "Неделя с"
                        : "Месяц"}
                    </th>
                    <th className="pb-3 font-medium text-gray-500 text-right">
                      Продано ключей
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats[
                    tab === "day"
                      ? "byDay"
                      : tab === "week"
                      ? "byWeek"
                      : "byMonth"
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="py-2.5">
                        {"date" in row
                          ? row.date
                          : "week" in row
                          ? row.week
                          : "month" in row
                          ? row.month
                          : ""}
                      </td>
                      <td className="py-2.5 text-right font-mono">
                        {row.sold}
                      </td>
                    </tr>
                  ))}
                  {stats[
                    tab === "day"
                      ? "byDay"
                      : tab === "week"
                      ? "byWeek"
                      : "byMonth"
                  ].length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="py-8 text-center text-gray-400"
                      >
                        Нет данных
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}