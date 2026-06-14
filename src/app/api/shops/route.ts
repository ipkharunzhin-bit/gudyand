import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/jwt";

// Получить все магазины пользователя
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    const { data: shops } = await supabaseAdmin
      .from("shops")
      .select("id, user_id, name, business_id, campaign_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      shops: shops || [],
      email: user?.email || "",
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// Добавить магазин
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const { name, business_id, api_key, campaign_id } = await request.json();

    if (!name || !business_id || !api_key || !campaign_id) {
      return NextResponse.json(
        { error: "Все поля обязательны" },
        { status: 400 }
      );
    }

    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .insert({
        user_id: userId,
        name,
        business_id,
        api_key,
        campaign_id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ shop });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}