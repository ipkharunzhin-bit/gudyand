import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/jwt";

// Получить все товары магазина
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shop_id");

    if (!shopId) {
      return NextResponse.json({ error: "shop_id required" }, { status: 400 });
    }

    // Проверяем, что магазин принадлежит пользователю
    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("id", shopId)
      .eq("user_id", userId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Получаем товары с подсчётом ключей
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("*, keys(id)")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    // Преобразуем keys в _count
    const result = (products || []).map((p) => ({
      ...p,
      _count_keys: p.keys?.length || 0,
      keys: undefined,
    }));

    return NextResponse.json({ products: result });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// Создать товар вручную
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { shop_id, offer_id, name, instruction } = await request.json();

    if (!shop_id || !offer_id || !name) {
      return NextResponse.json(
        { error: "shop_id, offer_id, name обязательны" },
        { status: 400 }
      );
    }

    // Проверяем магазин
    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("id", shop_id)
      .eq("user_id", userId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .insert({
        shop_id,
        offer_id,
        name,
        instruction: instruction || "",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// Обновить товар (инструкцию)
export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { id, instruction } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Проверяем принадлежность
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, shop_id")
      .eq("id", id)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("id", product.shop_id)
      .eq("user_id", userId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("products")
      .update({ instruction })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// Удалить товар
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("id");

    if (!productId) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Проверяем принадлежность
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, shop_id")
      .eq("id", productId)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("id", product.shop_id)
      .eq("user_id", userId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await supabaseAdmin.from("products").delete().eq("id", productId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}