import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/jwt";

// Получить все ключи товара
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json(
        { error: "product_id required" },
        { status: 400 }
      );
    }

    // Проверяем принадлежность товара пользователю
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, shop_id, name, instruction")
      .eq("id", productId)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id, api_key, business_id, campaign_id")
      .eq("id", product.shop_id)
      .eq("user_id", userId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: keys } = await supabaseAdmin
      .from("keys")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      product,
      keys: keys || [],
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// Добавить ключ (один или много)
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { product_id, codes } = await request.json();

    if (!product_id || !codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { error: "product_id и codes (массив) обязательны" },
        { status: 400 }
      );
    }

    // Проверяем принадлежность
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, shop_id, offer_id")
      .eq("id", product_id)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id, api_key, business_id, campaign_id")
      .eq("id", product.shop_id)
      .eq("user_id", userId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Добавляем ключи
    const rows = codes.map((code: string) => ({
      product_id,
      code: code.trim(),
      status: "available",
    }));

    const { error } = await supabaseAdmin.from("keys").insert(rows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Обновляем остатки на Яндекс Маркете
    const { data: existingKeys } = await supabaseAdmin
      .from("keys")
      .select("id")
      .eq("product_id", product_id)
      .eq("status", "available");

    if (existingKeys && existingKeys.length > 0) {
      // Если есть ключи — stock > 0
      const { updateStocks } = await import("@/lib/yandex");
      try {
        await updateStocks(
          shop.api_key,
          shop.business_id,
          shop.campaign_id,
          product.offer_id,
          1
        );
      } catch {
        // ignore stock update errors
      }
    }

    return NextResponse.json({ added: rows.length });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// Удалить ключ
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("key_id");

    if (!keyId) {
      return NextResponse.json(
        { error: "key_id required" },
        { status: 400 }
      );
    }

    // Проверяем принадлежность
    const { data: key } = await supabaseAdmin
      .from("keys")
      .select("id, product_id, status")
      .eq("id", keyId)
      .single();

    if (!key) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, shop_id, offer_id")
      .eq("id", key.product_id)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id, api_key, business_id, campaign_id")
      .eq("id", product.shop_id)
      .eq("user_id", userId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await supabaseAdmin.from("keys").delete().eq("id", keyId);

    // Проверяем, остались ли ключи
    const { count: remainingCount } = await supabaseAdmin
      .from("keys")
      .select("*", { count: "exact", head: true })
      .eq("product_id", product.id)
      .eq("status", "available");

    if (remainingCount === 0) {
      const { updateStocks } = await import("@/lib/yandex");
      try {
        await updateStocks(
          shop.api_key,
          shop.business_id,
          shop.campaign_id,
          product.offer_id,
          0
        );
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}