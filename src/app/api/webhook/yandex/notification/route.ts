import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { deliverDigitalGoods, updateStocks } from "@/lib/yandex";

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

    // PING проверка
    if (notificationType === "PING") {
      return NextResponse.json({ status: "ok", name: "webhook", version: "1.0", time: new Date().toISOString() });
    }

    // Обрабатываем только создание или изменение заказа
    if (notificationType !== "ORDER_CREATED" && notificationType !== "ORDER_STATUS_UPDATED") {
      return NextResponse.json({ status: "ignored", notificationType });
    }

    if (!orderId || !campaignId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing order data" }, { status: 400 });
    }

    const orderIdYM = String(orderId);

    // Ищем магазин по campaignId
    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("*")
      .eq("campaign_id", campaignId)
      .single();

    if (!shop) {
      return NextResponse.json({ status: "skipped", reason: "Shop not found for campaign " + campaignId });
    }

    // Проверяем, не обработали ли уже этот заказ
    const { data: existingOrder } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_id_ym", orderIdYM)
      .eq("shop_id", shop.id)
      .single();

    if (existingOrder) {
      return NextResponse.json({ status: "skipped", reason: "Order already processed" });
    }

    // Создаём запись заказа
    const { data: orderRecord } = await supabaseAdmin
      .from("orders")
      .insert({
        shop_id: shop.id,
        order_id_ym: orderIdYM,
        buyer_email: "",
        total_keys: 0,
        status: "PROCESSING",
      })
      .select()
      .single();

    if (!orderRecord) {
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    const itemsToDeliver: { id: number; codes: string[]; slip: string }[] = [];
    let totalKeys = 0;

    for (const item of items) {
      const offerId = item.offerId;
      const count = item.count || 1;

      // Находим товар в базе
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("id, instruction")
        .eq("shop_id", shop.id)
        .eq("offer_id", offerId)
        .single();

      if (!product) continue;

      // Берём нужное количество ключей
      const { data: availableKeys } = await supabaseAdmin
        .from("keys")
        .select("id, code")
        .eq("product_id", product.id)
        .eq("status", "available")
        .limit(count);

      if (!availableKeys || availableKeys.length < count) continue;

      const codes = availableKeys.map((k) => k.code);
      const keyIds = availableKeys.map((k) => k.id);

      // Помечаем как отправленные
      await supabaseAdmin
        .from("keys")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .in("id", keyIds);

      itemsToDeliver.push({ id: item.id || 0, codes, slip: product.instruction || "" });

      for (const keyId of keyIds) {
        await supabaseAdmin.from("order_items").insert({
          order_id: orderRecord.id,
          key_id: keyId,
          code: availableKeys.find((k) => k.id === keyId)?.code || "",
        });
      }

      totalKeys += codes.length;

      const { count: remainingCount } = await supabaseAdmin
        .from("keys")
        .select("*", { count: "exact", head: true })
        .eq("product_id", product.id)
        .eq("status", "available");

      if (remainingCount === 0) {
        await updateStocks(shop.api_key, shop.business_id, shop.campaign_id, offerId, 0)
          .catch((e) => console.error("Stocks update failed:", e));
      }
    }

    // Обновляем total_keys
    await supabaseAdmin
      .from("orders")
      .update({ total_keys: totalKeys })
      .eq("id", orderRecord.id);

    if (itemsToDeliver.length > 0) {
      await deliverDigitalGoods(
        shop.api_key,
        shop.business_id,
        shop.campaign_id,
        orderId,
        itemsToDeliver
      );
    }

    return NextResponse.json({ status: "ok", delivered: itemsToDeliver.length, totalKeys });
  } catch (err) {
    console.error("Webhook notification error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}