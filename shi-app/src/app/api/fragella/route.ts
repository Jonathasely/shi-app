import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.fragella.com/api/v1";
const API_KEY = process.env.FRAGELLA_API_KEY || "";

const ACCORD_PERCENT: Record<string, number> = {
  Dominant: 95,
  Prominent: 75,
  Moderate: 55,
  Light: 35,
  Faint: 15,
};

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
    // Fetch page 1 and page 2 in parallel to get up to 20 results
    const baseUrl = `${API_BASE}/fragrances?search=${encodeURIComponent(search)}&limit=10`;
    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}&page=1`, {
        headers: { "x-api-key": API_KEY },
        next: { revalidate: 3600 },
      }),
      fetch(`${baseUrl}&page=2`, {
        headers: { "x-api-key": API_KEY },
        next: { revalidate: 3600 },
      }),
    ]);

    if (!res1.ok) {
      return NextResponse.json(
        { error: `Fragella API error: ${res1.status}` },
        { status: res1.status }
      );
    }

    const data1 = await res1.json();
    const items1 = Array.isArray(data1) ? data1 : data1.data || [];

    let items2: any[] = [];
    if (res2.ok) {
      const data2 = await res2.json();
      items2 = Array.isArray(data2) ? data2 : data2.data || [];
    }

    // Combine both pages, deduplicate by _id
    const seen = new Set<string>();
    const items: any[] = [];
    for (const item of [...items1, ...items2]) {
      const id = item._id || item.id || item.name || "";
      if (!seen.has(id)) {
        seen.add(id);
        items.push(item);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perfumes = items.map((item: any) => {
      // Accords: array of strings like ["sweet","floral",...]
      const accords: string[] = item.accords || item["Main Accords"] || [];
      // AccordsPercentage: object like {"sweet":"Dominant","floral":"Prominent",...}
      const pctObj: Record<string, string> =
        item.accordsPercentage || item["Main Accords Percentage"] || {};

      const mappedAccords = accords.map((name: string) => ({
        name,
        value: ACCORD_PERCENT[pctObj[name]] || 50,
      }));

      // Notes: object with top/heart/base arrays of {name, image}
      const notes = item.notes || item.Notes || {};
      const topNotes = (notes.top || notes.Top || []).map((n: any) => ({
        name: n.name || n.Name || "",
        image: n.image || n.imageUrl || "",
      }));
      const heartNotes = (notes.heart || notes.Middle || []).map((n: any) => ({
        name: n.name || n.Name || "",
        image: n.image || n.imageUrl || "",
      }));
      const baseNotes = (notes.base || notes.Base || []).map((n: any) => ({
        name: n.name || n.Name || "",
        image: n.image || n.imageUrl || "",
      }));

      return {
        id: item._id || item.id || item.name || "",
        name: item.name || item.Name || "",
        brand: item.brand || item.Brand || "",
        gender: item.gender || item.Gender || "",
        image: item.image || item["Image URL"] || item.imageUrl || "",
        imageTransparent:
          item.imageTransparent || item["Image URL Transparent"] || "",
        accords: mappedAccords,
        notes: {
          top: topNotes,
          heart: heartNotes,
          base: baseNotes,
        },
      };
    });

    return NextResponse.json({ data: perfumes });
  } catch (err) {
    console.error("Fragella proxy error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from Fragella" },
      { status: 502 }
    );
  }
}
