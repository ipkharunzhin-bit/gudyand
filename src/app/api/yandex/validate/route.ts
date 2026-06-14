import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/jwt";
import { validateApiKey } from "@/lib/yandex";

// Проверить валидность API-ключа магазина
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shop_id");

    if (!shopId) {
      return NextResponse.json({ error: "shop_id required" }, { status: 400 });
    }

    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("api_key, business_id")
      .eq("id", shopId)
      .eq("user_id", userId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Проверяем ключ через Яндекс API
    const result = await validateApiKey(shop.api_key);

    const apiBusinessId = result.businessId ?? (result.campaigns?.[0]?.businessId ?? null);

    return NextResponse.json({
      success: true,
      api_business_id: apiBusinessId,
      shop_business_id: shop.business_id,
      match: apiBusinessId === shop.business_id,
      campaigns: result.campaigns || [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка проверки ключа";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}