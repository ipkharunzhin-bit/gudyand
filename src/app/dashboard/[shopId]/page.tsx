"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Product } from "@/types";
import {
  ArrowLeft,
  Download,
  Package,
  ShoppingBag,
  BarChart3,
  Search,
  Pencil,
  X,
  Trash2,
} from "lucide-react";

interface ShopData {
  id: string;
  name: string;
  business_id: number;
  api_key: string;
  campaign_id: number;
}

export default function ShopProductsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [shopName, setShopName] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBusinessId, setEditBusinessId] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [editCampaignId, setEditCampaignId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    loadProducts(shopId);
    loadShop(shopId);
  }, [shopId]);

  async function loadShop(id: string) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/shops/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setShopName(data.shop?.name || ""); }
    } catch {}
  }

  async function loadProducts(id: string) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/products?shop_id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProducts(data.products || []);
    } catch (err) { setError(err instanceof Error ? err.message : "Ошибка"); } finally { setLoading(false); }
  }

  async function handleDeleteProduct(productId: string) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/products?id=${productId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch {}
  }

  async function handleDeleteAllProducts() {
    if (!confirm("Удалить ВСЕ товары магазина?")) return;
    setDeletingAll(true);
    try {
      const token = localStorage.getItem("token");
      for (const p of products) {
        await fetch(`/api/products?id=${p.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      }
      setProducts([]);
    } catch {} finally { setDeletingAll(false); }
  }

  async function handleLoadFromYandex() {
    setLoadingProducts(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/yandex/products?shop_id=${shopId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadProducts(shopId);
    } catch (err) { setError(err instanceof Error ? err.message : "Ошибка"); } finally { setLoadingProducts(false); }
  }

  async function openEdit() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/shops/${shopId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const shop: ShopData = data.shop;
      setEditName(shop.name);
      setEditBusinessId(String(shop.business_id));
      setEditApiKey(shop.api_key);
      setEditCampaignId(String(shop.campaign_id));
      setEditOpen(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Ошибка загрузки данных"); }
  }

  async function saveEdit() {
    setEditSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/shops/${shopId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName, business_id: parseInt(editBusinessId), api_key: editApiKey, campaign_id: parseInt(editCampaignId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShopName(editName);
      setEditOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Ошибка сохранения"); } finally { setEditSaving(false); }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.offer_id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-sm text-gray-500">Загрузка...</p></div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-400 hover:text-black transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="text-lg font-bold">{shopName || "Магазин"}</h1>
            <button onClick={openEdit} className="text-gray-400 hover:text-black transition-colors p-1" title="Редактировать магазин"><Pencil className="h-4 w-4" /></button>
          </div>
          <nav className="flex items-center gap-2">
            <Link href={`/dashboard/${shopId}/orders`} className="btn-secondary text-xs"><ShoppingBag className="mr-1 h-4 w-4" />Заказы</Link>
            <Link href={`/dashboard/${shopId}/stats`} className="btn-secondary text-xs"><BarChart3 className="mr-1 h-4 w-4" />Статистика</Link>
          </nav>
        </div>
      </header>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Редактировать магазин</h2>
              <button onClick={() => setEditOpen(false)} className="text-gray-400 hover:text-black"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Название</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">Business ID</label><input type="number" value={editBusinessId} onChange={(e) => setEditBusinessId(e.target.value)} className="input-field w-full" /></div>
              <div><label className="block text-sm font-medium mb-1">API Key</label><input type="text" value={editApiKey} onChange={(e) => setEditApiKey(e.target.value)} className="input-field w-full" placeholder="Ваш партнёрский API-ключ" /></div>
              <div><label className="block text-sm font-medium mb-1">Campaign ID</label><input type="number" value={editCampaignId} onChange={(e) => setEditCampaignId(e.target.value)} className="input-field w-full" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditOpen(false)} className="btn-secondary">Отмена</button>
              <button onClick={saveEdit} disabled={editSaving} className="btn-primary">{editSaving ? "Сохранение..." : "Сохранить"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-6 py-8">
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}

        <div className="card mb-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" placeholder="Поиск по названию или offer_id..." />
          </div>
          <button onClick={handleDeleteAllProducts} disabled={deletingAll || products.length === 0} className="btn-danger whitespace-nowrap">
            <Trash2 className="mr-1 h-4 w-4" />{deletingAll ? "Удаление..." : "Удалить все"}
          </button>
          <button onClick={handleLoadFromYandex} disabled={loadingProducts} className="btn-primary whitespace-nowrap">
            <Download className="mr-1 h-4 w-4" />{loadingProducts ? "Загрузка..." : "Загрузить товары"}
          </button>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">
              {products.length === 0 ? "Нет товаров. Нажмите «Загрузить товары» для синхронизации с Яндекс Маркетом" : "Ничего не найдено"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => (
              <div key={product.id} className="card flex items-center justify-between hover:border-gray-300 transition-all group">
                <Link href={`/dashboard/${shopId}/products/${product.id}`} className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{product.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">offer_id: {product.offer_id}</p>
                </Link>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {(product as unknown as Record<string, number>)._count_keys ?? 0} ключей
                  </span>
                  <span className="text-gray-300">→</span>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); handleDeleteProduct(product.id); }}
                  className="ml-4 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Удалить товар"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}