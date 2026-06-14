import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrders, deliverDigitalGoods, updateStocks } from "@/lib/yandex";

// Принимает уведомления от Яндекс Маркета
// Документация: https://yandex.ru/dev/market/partner-api/doc/ru/push-notifications/reference/sendNotification

export async function POST(request: NextRequest) {
  try {
    // Проверка секретного ключа вебхука
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const headerSecret = request.headers.get("x-webhook-secret");
      if (headerSecret !== webhookSecret) {
        return NextResponse.json(
          { error: "Invalid webhook secret" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { event, order } = body;

    // Интересуют только события изменения заказа
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

    // Обрабатываем только заказы в статусе PROCESSING
    if (status !== "PROCESSING") {
      return NextResponse.json({
        status: "skipped",
        reason: `Order status is ${status}, not PROCESSING`,
      });
    }

    // Ищем все магазины с подходящим campaignId
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
      return NextResponse.json({
        status: "skipped",
        reason: "Shop not found for campaign",
      });
    }

    // Проверяем, не обработали ли уже этот заказ
    const { data: existingOrder } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_id_ym", orderIdYM)
      .eq("shop_id", shop.id)
      .single();

    if (existingOrder) {
      return NextResponse.json({
        status: "skipped",
        reason: "Order already processed",
      });
    }

    // Получаем детали заказа из API
    const ordersData = await getOrders(shop.api_key, shop.business_id, {
      statuses: ["PROCESSING"],
      campaignIds: [shop.campaign_id],
      limit: 10,
    });

    const fullOrder = ordersData.orders?.find((o) => o.id === order.id);
    if (!fullOrder) {
      return NextResponse.json({ error: "Order not found in API" }, { status: 404 });
    }

    // Для каждого товара в заказе подбираем ключи
    const itemsToDeliver: { id: number; codes: string[]; slip: string }[] = [];
    let totalKeys = 0;

    for (const item of fullOrder.items) {
      const offerId = item.offerId;
      const count = item.count;

      // Находим товар в базе по offer_id
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("id, instruction")
        .eq("shop_id", shop.id)
        .eq("offer_id", offerId)
        .single();

      if (!product) {
        console.log(`Product not found for offer_id: ${offerId}`);
        continue;
      }

      // Берём нужное количество доступных ключей
      const { data: availableKeys } = await supabaseAdmin
        .from("keys")
        .select("id, code")
        .eq("product_id", product.id)
        .eq("status", "available")
        .limit(count);

      if (!availableKeys || availableKeys.length < count) {
        // Недостаточно ключей — пропускаем этот товар
        console.log(`Not enough keys for product ${offerId}, needed ${count}, got ${availableKeys?.length || 0}`);
        continue;
      }

      const codes = availableKeys.map((k) => k.code);
      const keyIds = availableKeys.map((k) => k.id);

      // Помечаем ключи как отправленные
      await supabaseAdmin
        .from("keys")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .in("id", keyIds);

      itemsToDeliver.push({
        id: item.id,
        codes,
        slip: product.instruction || "",
      });

      // Создаём запись заказа
      const { data: orderRecord } = await supabaseAdmin
        .from("orders")
        .insert({
          shop_id: shop.id,
          order_id_ym: orderIdYM,
          buyer_email: buyerEmail,
          total_keys: codes.length,
          status: "PROCESSING",
        })
        .select()
        .single();

      // Создаём order_items
      if (orderRecord) {
        for (const keyId of keyIds) {
          await supabaseAdmin.from("order_items").insert({
            order_id: orderRecord.id,
            key_id: keyId,
            code: availableKeys.find((k) => k.id === keyId)?.code || "",
          });
        }
      }

      totalKeys += codes.length;

      // Проверяем, остались ли ключи → обновляем остатки на Яндекс Маркете
      const { count: remainingCount } = await supabaseAdmin
        .from("keys")
        .select("*", { count: "exact", head: true })
        .eq("product_id", product.id)
        .eq("status", "available");

      if (remainingCount === 0) {
        // Выставляем stock=0
        await updateStocks(
          shop.api_key,
          shop.business_id,
          shop.campaign_id,
          offerId,
          0
        ).catch((err) => console.error("Failed to update stocks:", err));
      }
    }

    // Отправляем ключи через API Яндекса
    if (itemsToDeliver.length > 0) {
      await deliverDigitalGoods(
        shop.api_key,
        shop.business_id,
        shop.campaign_id,
        order.id,
        itemsToDeliver
      );
    }

    return NextResponse.json({
      status: "ok",
      delivered: itemsToDeliver.length,
      totalKeys,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}