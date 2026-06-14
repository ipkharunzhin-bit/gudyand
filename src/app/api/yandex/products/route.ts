import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/jwt";
import { getCampaignOffers } from "@/lib/yandex";

// Загрузить товары из Яндекс Маркета
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shop_id");

    if (!shopId) {
      return NextResponse.json({ error: "shop_id required" }, { status: 400 });
    }

    // Получаем магазин
    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .eq("user_id", userId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Получаем товары из API Яндекса
    const offers = await getCampaignOffers(
      shop.api_key,
      shop.business_id,
      shop.campaign_id
    );

    let added = 0;
    let skipped = 0;

    for (const offer of offers) {
      // Проверяем, есть ли уже такой товар
      const { data: existing } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("shop_id", shopId)
        .eq("offer_id", offer.offerId)
        .single();

      if (!existing) {
        await supabaseAdmin.from("products").insert({
          shop_id: shopId,
          offer_id: offer.offerId,
          name: offer.name || offer.offerId,
          instruction: "",
        });
        added++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      added,
      skipped,
      total: offers.length,
    });
  } catch (err) {
    console.error("Yandex products error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Ошибка загрузки товаров",
      },
      { status: 500 }
    );
  }
}