import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.fragella.com/api/v1";
const API_KEY = process.env.FRAGELLA_API_KEY || "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const limit = searchParams.get("limit") || "10";

  if (!search.trim()) {
    return NextResponse.json({ data: [] });
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Fragella API key not configured" },
      { status: 500 }
    );
  }

  try {
    const url = `${API_BASE}/fragrances?search=${encodeURIComponent(search)}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { "x-api-key": API_KEY },
      next: { revalidate: 3600 }, // cache 1h
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Fragella API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Normalize response — API can return array or { data: [...] }
    const items = Array.isArray(data) ? data : data.data || [];

    // Map to slim shape for frontend
    const perfumes = items.map((item: Record<string, unknown>) => ({
      id: item._id || item.id || "",
      name: item.Name || item.name || "",
      brand: item.Brand || item.brand || "",
      gender: item.Gender || item.gender || "",
      image: item["Image URL"] || item.imageUrl || item.image || "",
      imageTransparent: item["Image URL Transparent"] || "",
      accords:
        (item["Main Accords"] as string[] | undefined) ||
        (item.accords as string[] | undefined) ||
        [],
      accordsPercentage:
        (item["Main Accords Percentage"] as string[] | undefined) || [],
      notes: {
        top: extractNotes(item, "Top"),
        heart: extractNotes(item, "Middle"),
        base: extractNotes(item, "Base"),
      },
    }));

    return NextResponse.json({ data: perfumes });
  } catch (err) {
    console.error("Fragella proxy error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from Fragella" },
      { status: 502 }
    );
  }
}

function extractNotes(
  item: Record<string, unknown>,
  layer: string
): { name: string; image?: string }[] {
  const notes = item.Notes as Record<string, unknown[]> | undefined;
  if (!notes || !notes[layer]) return [];
  return (notes[layer] as { name?: string; imageUrl?: string }[]).map((n) => ({
    name: n.name || "",
    image: n.imageUrl || "",
  }));
}
