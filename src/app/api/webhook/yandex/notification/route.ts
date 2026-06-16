import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { deliverDigitalGoods, updateStocks } from "@/lib/yandex";

const YANDEX_API = "https://api.partner.market.yandex.ru";

// Получить заказ по ID напрямую (без фильтрации по статусу)
async function getOrderById(apiKey: string, businessId: number, orderId: number) {
  const res = await fetch(`${YANDEX_API}/v2/businesses/${businessId}/orders/${orderId}`, {
    headers: { "Api-Key": apiKey, Accept: "application/json" },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Yandex API error ${res.status}: ${errorText}`);
  }
  const data = await res.json();
  return data.order || null;
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "ok" });
  }

  try {
    const { notificationType, orderId, campaignId, items, createdAt } = body;

    if (notificationType === "PING") {
      return NextResponse.json({ status: "ok", name: "webhook", version: "1.0", time: new Date().toISOString() });
    }

    if (notificationType !== "ORDER_CREATED" && notificationType !== "ORDER_STATUS_UPDATED") {
      return NextResponse.json({ status: "ignored", notificationType });
    }

    if (!orderId || !campaignId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing order data" }, { status: 400 });
    }

    const orderIdYM = String(orderId);

    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("*")
      .eq("campaign_id", campaignId)
      .single();

    if (!shop) {
      return NextResponse.json({ status: "skipped", reason: "Shop not found" });
    }

    // Проверяем, не обработан ли заказ
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_id_ym", orderIdYM)
      .eq("shop_id", shop.id)
      .single();

    if (existing) {
      return NextResponse.json({ status: "skipped", reason: "Already processed" });
    }

    // Запрашиваем детали заказа по ID (без фильтрации по статусу)
    const fullOrder = await getOrderById(shop.api_key, shop.business_id, Number(orderIdYM));
    if (!fullOrder || !fullOrder.items) {
      return NextResponse.json({ error: "Order not found in API" }, { status: 404 });
    }

    const itemsToDeliver: { id: number; codes: string[]; slip: string }[] = [];
    const keyIdsToMark: string[] = [];
    let totalKeys = 0;

    for (const yandexItem of fullOrder.items) {
      const offerId = yandexItem.offerId;
      const count = yandexItem.count || 1;
      const itemId = yandexItem.id; // реальный ID из API

      const { data: product } = await supabaseAdmin
        .from("products")
        .select("id, instruction")
        .eq("shop_id", shop.id)
        .eq("offer_id", offerId)
        .single();

      if (!product) continue;

      const { data: availableKeys } = await supabaseAdmin
        .from("keys")
        .select("id, code")
        .eq("product_id", product.id)
        .eq("status", "available")
        .limit(count);

      if (!availableKeys || availableKeys.length < count) continue;

      itemsToDeliver.push({
        id: itemId,
        codes: availableKeys.map((k) => k.code),
        slip: product.instruction || "",
      });

      keyIdsToMark.push(...availableKeys.map((k) => k.id));
      totalKeys += availableKeys.length;
    }

    if (itemsToDeliver.length === 0) {
      return NextResponse.json({ status: "skipped", reason: "No keys available" });
    }

    // Сначала доставляем в Яндекс
    await deliverDigitalGoods(
      shop.api_key,
      shop.business_id,
      shop.campaign_id,
      Number(orderIdYM),
      itemsToDeliver
    );

    // Только после успешной доставки помечаем ключи
    await supabaseAdmin
      .from("keys")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .in("id", keyIdsToMark);

    // Создаём запись заказа
    await supabaseAdmin.from("orders").insert({
      shop_id: shop.id,
      order_id_ym: orderIdYM,
      buyer_email: fullOrder.buyer?.email || "",
      total_keys: totalKeys,
      status: "PROCESSING",
    });

    return NextResponse.json({ status: "ok", delivered: itemsToDeliver.length, totalKeys });
  } catch (err: any) {
    console.error("Webhook error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}