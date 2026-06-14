import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/jwt";

// Получить один магазин (включая api_key)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    const { id } = await params;

    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    return NextResponse.json({ shop });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// Обновить магазин
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    const { id } = await params;
    const { name, business_id, api_key, campaign_id } = await request.json();

    // Проверяем, что магазин принадлежит пользователю
    const { data: existing } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (business_id !== undefined) updates.business_id = business_id;
    if (api_key !== undefined) updates.api_key = api_key;
    if (campaign_id !== undefined) updates.campaign_id = campaign_id;

    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
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