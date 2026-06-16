import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrders, deliverDigitalGoods, updateStocks } from "@/lib/yandex";

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
    const { event, type, notificationType, order } = body;

    // PING проверка — Яндекс требует поле name
    if (type === "PING" || event === "PING" || notificationType === "PING") {
      return NextResponse.json({ status: "ok", name: "webhook", version: "1.0" });
    }

    if (
      event !== "ORDER_STATUS_UPDATED" &&
      event !== "ORDER_CREATED" &&
      event !== "ORDER_STATUS_CHANGED"
    ) {
      return NextResponse.json({ status: "ignored", event });
    }

    if (!order) {
      return NextResponse.json({ error: "No order data" }, { status: 400 });
    }

    const orderIdYM = String(order.id);
    const status = order.status;
    const buyerEmail = order.buyer?.email || "";

    if (status !== "PROCESSING") {
      return NextResponse.json({ status: "skipped", reason: `Order status is ${status}, not PROCESSING` });
    }

    const campaignId = order.campaignId;
    if (!campaignId) {
      return NextResponse.json({ error: "No campaignId" }, { status: 400 });
    }

    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("*")
      .eq("campaign_id", campaignId)
      .single();

    if (!shop) {
      return NextResponse.json({ status: "skipped", reason: "Shop not found for campaign" });
    }

    const { data: existingOrder } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_id_ym", orderIdYM)
      .eq("shop_id", shop.id)
      .single();

    if (existingOrder) {
      return NextResponse.json({ status: "skipped", reason: "Order already processed" });
    }

    const ordersData = await getOrders(shop.api_key, shop.business_id, {
      statuses: ["PROCESSING"],
      campaignIds: [shop.campaign_id],
      limit: 10,
    });

    const fullOrder = ordersData.orders?.find((o) => o.id === order.id);
    if (!fullOrder) {
      return NextResponse.json({ error: "Order not found in API" }, { status: 404 });
    }

    const { data: orderRecord } = await supabaseAdmin
      .from("orders")
      .insert({
        shop_id: shop.id,
        order_id_ym: orderIdYM,
        buyer_email: buyerEmail,
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

    for (const item of fullOrder.items) {
      const offerId = item.offerId;
      const count = item.count;

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

      const codes = availableKeys.map((k) => k.code);
      const keyIds = availableKeys.map((k) => k.id);

      await supabaseAdmin
        .from("keys")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .in("id", keyIds);

      itemsToDeliver.push({ id: item.id, codes, slip: product.instruction || "" });

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
          .catch(() => {});
      }
    }

    await supabaseAdmin
      .from("orders")
      .update({ total_keys: totalKeys })
      .eq("id", orderRecord.id);

    if (itemsToDeliver.length > 0) {
      await deliverDigitalGoods(shop.api_key, shop.business_id, shop.campaign_id, order.id, itemsToDeliver);
    }

    return NextResponse.json({ status: "ok", delivered: itemsToDeliver.length, totalKeys });
  } catch (err) {
    console.error("Webhook notification error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
