import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { deliverDigitalGoods, updateStocks } from "@/lib/yandex";

const YANDEX_API = "https://api.partner.market.yandex.ru";

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ status: "ok" }); }

  try {
    const { notificationType, orderId, campaignId, items, createdAt } = body;

    if (notificationType === "PING") {
      return NextResponse.json({ status: "ok", name: "webhook", version: "1.0", time: new Date().toISOString() });
    }

    if (notificationType !== "ORDER_CREATED" && notificationType !== "ORDER_STATUS_UPDATED") {
      return NextResponse.json({ status: "ignored", notificationType });
    }

    if (!orderId || !campaignId) {
      return NextResponse.json({ error: "Missing order data" }, { status: 400 });
    }

    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("*")
      .eq("campaign_id", campaignId)
      .single();

    if (!shop) return NextResponse.json({ status: "skipped", reason: "Shop not found" });

    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_id_ym", String(orderId))
      .eq("shop_id", shop.id)
      .single();

    if (existing) return NextResponse.json({ status: "skipped", reason: "Already processed" });

    // Получаем детали заказа для item.id
    let orderItems: any[] = [];
    try {
      const res = await fetch(`${YANDEX_API}/campaigns/${campaignId}/orders/${orderId}`, {
        headers: { "Api-Key": shop.api_key, Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.order?.items) orderItems = data.order.items;
      }
    } catch {}

    // Если не получили через API — используем уведомление
    if (orderItems.length === 0 && items && Array.isArray(items)) {
      orderItems = items.map((i: any) => ({ offerId: i.offerId, count: i.count, id: 0 }));
    }

    const itemsToDeliver: any[] = [];
    const keyIdsToMark: string[] = [];
    let totalKeys = 0;

    for (const orderItem of orderItems) {
      const offerId = orderItem.offerId;
      const count = orderItem.count || 1;
      const itemId = orderItem.id; // реальный ID из API

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
        activateTill: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      });

      keyIdsToMark.push(...availableKeys.map((k) => k.id));
      totalKeys += availableKeys.length;
    }

    if (itemsToDeliver.length === 0) {
      return NextResponse.json({ status: "skipped", reason: "No keys available" });
    }

    await deliverDigitalGoods(shop.api_key, shop.business_id, shop.campaign_id, Number(orderId), itemsToDeliver);

    await supabaseAdmin
      .from("keys")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .in("id", keyIdsToMark);

    await supabaseAdmin.from("orders").insert({
      shop_id: shop.id,
      order_id_ym: String(orderId),
      buyer_email: "",
      total_keys: totalKeys,
      status: "PROCESSING",
    });

    return NextResponse.json({ status: "ok", delivered: itemsToDeliver.length, totalKeys });
  } catch (err: any) {
    console.error("Webhook error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}