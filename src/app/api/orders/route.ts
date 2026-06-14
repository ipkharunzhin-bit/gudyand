import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/jwt";

// Получить все заказы магазина
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shop_id");

    if (!shopId) {
      return NextResponse.json({ error: "shop_id required" }, { status: 400 });
    }

    // Проверяем магазин
    const { data: shop } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("id", shopId)
      .eq("user_id", userId)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ orders: orders || [] });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}