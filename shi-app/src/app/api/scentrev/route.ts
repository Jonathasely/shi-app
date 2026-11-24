import { NextRequest, NextResponse } from "next/server";

/**
 * ScentRev API proxy — busca fragrâncias via REST/MCP
 * Docs: https://mcp.scentrev.com/docs
 * 126k+ fragrâncias, acordes 0-100, notas top/heart/base
 *
 * Tenta múltiplos formatos de endpoint (REST e MCP Streamable HTTP)
 * Falha silenciosamente se a API não responder — DB local é o backup
 */

const API_KEY = process.env.SCENTREV_API_KEY || "";
const MCP_URL = "https://api.scentrev.com/mcp/";

/* Tradução de accords EN → PT (reutilizando mapa da Fragella) */
const ACCORD_PT: Record<string, string> = {
  floral: "Floral", sweet: "Doce", woody: "Amadeirado", fresh: "Fresco",
  citrus: "Cítrico", fruity: "Frutado", musky: "Musk", powdery: "Empolvado",
  warm: "Quente", spicy: "Especiado", aromatic: "Aromático", amber: "Âmbar",
  vanilla: "Baunilha", leather: "Couro", smoky: "Defumado", aquatic: "Aquático",
  green: "Verde", oriental: "Oriental", balsamic: "Balsâmico", herbal: "Herbal",
  earthy: "Terroso", gourmand: "Gourmand", oud: "Oud", rose: "Rosa",
  tropical: "Tropical", mossy: "Musgoso", ozonic: "Ozônico", creamy: "Cremoso",
  nutty: "Avelã", animalic: "Animalic", soapy: "Ensaboado", patchouli: "Patchouli",
  lavender: "Lavanda", marine: "Marinho", aldehydic: "Aldeídico", tobacco: "Tabaco",
  cinnamon: "Canela", coconut: "Coco", honey: "Mel", iris: "Íris",
  jasmine: "Jasmim", soft: "Suave", metallic: "Metálico", resinous: "Resinoso",
  salty: "Salgado", "warm spicy": "Especiado Quente", "warm-spicy": "Especiado Quente",
  "fresh spicy": "Especiado Fresco", "fresh-spicy": "Especiado Fresco",
  "white floral": "Floral Branco", "white-floral": "Floral Branco",
  "yellow floral": "Floral Amarelo",
  "yellow-floral": "Floral Amarelo", almond: "Amêndoa",
  "powdery floral": "Floral Empolvado", "sweet floral": "Floral Doce",
  caramel: "Caramelo", coffee: "Café", chocolate: "Chocolate",
};

const NOTE_PT: Record<string, string> = {
  bergamot: "Bergamota", lemon: "Limão", orange: "Laranja", grapefruit: "Toranja",
  "mandarin orange": "Tangerina", lime: "Lima", "blood orange": "Laranja Sanguínea",
  yuzu: "Yuzu", rose: "Rosa", jasmine: "Jasmim", iris: "Íris", violet: "Violeta",
  lily: "Lírio", tuberose: "Tuberosa", magnolia: "Magnólia", orchid: "Orquídea",
  peony: "Peônia", freesia: "Frésia", gardenia: "Gardênia", neroli: "Neroli",
  "ylang-ylang": "Ylang-Ylang", geranium: "Gerânio", lavender: "Lavanda",
  "orange blossom": "Flor de Laranjeira", apple: "Maçã", peach: "Pêssego",
  pear: "Pera", plum: "Ameixa", cherry: "Cereja", raspberry: "Framboesa",
  strawberry: "Morango", fig: "Figo", pomegranate: "Romã", lychee: "Lichia",
  "passion fruit": "Maracujá", pineapple: "Abacaxi", coconut: "Coco", melon: "Melão",
  cassis: "Cassis", pepper: "Pimenta", "black pepper": "Pimenta Preta",
  "pink pepper": "Pimenta Rosa", cinnamon: "Canela", cardamom: "Cardamomo",
  clove: "Cravo-da-Índia", nutmeg: "Noz-Moscada", saffron: "Açafrão", ginger: "Gengibre",
  cumin: "Cominho", coriander: "Coentro", sandalwood: "Sândalo", cedar: "Cedro",
  oud: "Oud", vetiver: "Vetiver", patchouli: "Patchouli", birch: "Bétula",
  cypress: "Cipreste", bamboo: "Bambu", amber: "Âmbar", incense: "Incenso",
  frankincense: "Olíbano", myrrh: "Mirra", benzoin: "Benjoim", labdanum: "Ládano",
  vanilla: "Baunilha", chocolate: "Chocolate", coffee: "Café", caramel: "Caramelo",
  honey: "Mel", almond: "Amêndoa", cocoa: "Cacau", rum: "Rum", praline: "Praliné",
  "cotton candy": "Algodão Doce", musk: "Almíscar", "white musk": "Almíscar Branco",
  leather: "Couro", suede: "Camurça", tobacco: "Tabaco", mint: "Menta",
  spearmint: "Hortelã", rosemary: "Alecrim", sage: "Sálvia", basil: "Manjericão",
  "green tea": "Chá Verde", "tonka bean": "Fava Tonka", ambroxan: "Ambroxan",
  aldehydes: "Aldeídos", "sea salt": "Sal Marinho", oakmoss: "Musgo de Carvalho",
  cashmeran: "Cashmeran", "pink grapefruit": "Toranja Rosa",
};

function translateAccord(name: string): string {
  return ACCORD_PT[name.toLowerCase()] || name;
}

function translateNote(name: string): string {
  return NOTE_PT[name.toLowerCase()] || name;
}

/**
 * Tenta chamar a ScentRev via MCP Streamable HTTP (JSON-RPC sobre POST)
 */
async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>,
  signal?: AbortSignal
): Promise<unknown> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: toolName, arguments: args },
      id: 1,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`MCP ${res.status}: ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type") || "";

  // Resposta JSON direta
  if (contentType.includes("application/json")) {
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || "MCP error");
    return json.result;
  }

  // SSE — ler até achar o resultado
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.result) return parsed.result;
        } catch { /* skip non-JSON lines */ }
      }
    }
    // Tentar parsear o texto inteiro como JSON
    try {
      const parsed = JSON.parse(text);
      if (parsed.result) return parsed.result;
      return parsed;
    } catch { /* nada */ }
  }

  // Tentar parsear como JSON de qualquer jeito
  const text = await res.text();
  return JSON.parse(text);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPerfumes(result: any): any[] {
  if (!result) return [];

  // MCP tools/call result format: { content: [{ type: "text", text: "..." }] }
  if (result.content && Array.isArray(result.content)) {
    for (const block of result.content) {
      if (block.type === "text" && block.text) {
        try {
          const parsed = JSON.parse(block.text);
          if (Array.isArray(parsed)) return parsed;
          if (parsed.results) return parsed.results;
          if (parsed.data) return parsed.data;
          if (parsed.fragrances) return parsed.fragrances;
          return [parsed];
        } catch {
          return [];
        }
      }
    }
  }

  // Direct array or object with results
  if (Array.isArray(result)) return result;
  if (result.results) return result.results;
  if (result.data) return result.data;
  if (result.fragrances) return result.fragrances;
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSingleResult(result: any): any {
  if (!result) return null;
  // MCP format: { content: [{ type: "text", text: "..." }] }
  if (result.content && Array.isArray(result.content)) {
    for (const block of result.content) {
      if (block.type === "text" && block.text) {
        try { return JSON.parse(block.text); } catch { return null; }
      }
    }
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAccords(data: any): { name: string; value: number }[] {
  // Pode vir como array ou objeto
  let items: any[] = [];
  if (Array.isArray(data)) items = data;
  else if (data.accords && Array.isArray(data.accords)) items = data.accords;
  else if (typeof data === "object" && !Array.isArray(data)) {
    // Pode ser { floral: 0.8, woody: 0.5 }
    return Object.entries(data)
      .filter(([k]) => k !== "slug" && k !== "name" && k !== "id")
      .map(([name, val]: [string, any]) => ({
        name: translateAccord(name),
        value: typeof val === "number" ? (val <= 1 ? Math.round(val * 100) : Math.round(val)) : 50,
      }))
      .filter((a) => a.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }

  return items
    .map((a: any) => ({
      name: translateAccord(a.name || a.accord || ""),
      value: typeof a.value === "number"
        ? (a.value <= 1 ? Math.round(a.value * 100) : Math.round(a.value))
        : typeof a.percentage === "number"
          ? Math.round(a.percentage)
          : typeof a.strength === "number"
            ? (a.strength <= 1 ? Math.round(a.strength * 100) : Math.round(a.strength))
            : 50,
    }))
    .filter((a) => a.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotes(data: any): { top: string[]; heart: string[]; base: string[] } {
  const notes = data.notes || data.note_pyramid || data;
  const convert = (arr: any): string[] => {
    if (!arr) return [];
    if (Array.isArray(arr)) {
      return arr.map((n: any) => translateNote(typeof n === "string" ? n : n.name || ""));
    }
    return [];
  };
  return {
    top: convert(notes.top),
    heart: convert(notes.heart || notes.mid || notes.middle),
    base: convert(notes.base || notes.bottom),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const debug = searchParams.get("debug") === "1";

  if (!search.trim()) {
    return NextResponse.json({ data: [] });
  }

  if (!API_KEY) {
    return NextResponse.json({ data: [], error: "ScentRev API key not configured" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debugLog: any[] = [];

  try {
    // Timeout de 6s total para busca + enriquecimento
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    // 1. Buscar fragrâncias pelo nome
    const result = await callMcpTool(
      "search_fragrances",
      { query: search },
      controller.signal
    );

    if (debug) debugLog.push({ step: "search_raw", result });

    const items = extractPerfumes(result);
    if (debug) debugLog.push({ step: "search_extracted", count: items.length, first: items[0] });

    const top5 = items.slice(0, 5);

    // 2. Enriquecer top 5 com acordes e notas (em paralelo)
    const enriched = await Promise.all(
      top5.map(async (item: any) => {
        // Usar fragrance_slug retornado pelo search (ex: "mugler-alien-liqueur-de-parfum")
        const fragranceSlug = item.fragrance_slug || item.slug || "";
        // Extrair marca do slug (primeira parte antes do primeiro "-" do nome)
        const slugBrand = fragranceSlug.split("-")[0] || "";
        const brandFromSlug = slugBrand.charAt(0).toUpperCase() + slugBrand.slice(1);
        const basePerfume = {
          id: item.public_id || fragranceSlug || item.name || "",
          name: item.name || item.fragrance || "",
          brand: item.brand || item.house || brandFromSlug,
          image: item.image || item.imageUrl || item.image_url || "",
          accords: [] as { name: string; value: number }[],
          notes: { top: [] as string[], heart: [] as string[], base: [] as string[] },
        };

        if (!fragranceSlug) return basePerfume;

        // Tentar buscar perfil completo (acordes, notas, etc.)
        try {
          const [profileRes, accordsRes, notesRes] = await Promise.allSettled([
            callMcpTool("get_fragrance_profile", { fragrance_slug: fragranceSlug }, controller.signal),
            callMcpTool("get_accords", { fragrance_slug: fragranceSlug }, controller.signal),
            callMcpTool("get_note_pyramid", { fragrance_slug: fragranceSlug }, controller.signal),
          ]);

          if (debug) {
            debugLog.push({
              step: "enrich_" + fragranceSlug.slice(0, 40),
              profile: profileRes.status === "fulfilled" ? profileRes.value : profileRes.status === "rejected" ? String((profileRes as any).reason) : null,
              accords: accordsRes.status === "fulfilled" ? accordsRes.value : accordsRes.status === "rejected" ? String((accordsRes as any).reason) : null,
              notes: notesRes.status === "fulfilled" ? notesRes.value : notesRes.status === "rejected" ? String((notesRes as any).reason) : null,
            });
          }

          // Extrair brand do perfil (estrutura: { identity: { brand_name, ... } })
          if (profileRes.status === "fulfilled" && profileRes.value) {
            const profile = extractSingleResult(profileRes.value);
            if (profile && !profile.error) {
              const identity = profile.identity || profile;
              basePerfume.brand = identity.brand_name || identity.brand || profile.brand || profile.house || basePerfume.brand;
              basePerfume.image = identity.image || profile.image || profile.imageUrl || basePerfume.image;
            }
          }

          // Extrair acordes
          if (accordsRes.status === "fulfilled" && accordsRes.value) {
            const accData = extractSingleResult(accordsRes.value);
            if (accData && !accData.error) {
              basePerfume.accords = mapAccords(accData);
            }
          }

          // Extrair notas
          if (notesRes.status === "fulfilled" && notesRes.value) {
            const notesData = extractSingleResult(notesRes.value);
            if (notesData && !notesData.error) {
              basePerfume.notes = mapNotes(notesData);
            }
          }
        } catch {
          // Se enriquecimento falhar, retorna dados básicos mesmo
        }

        return basePerfume;
      })
    );

    clearTimeout(timeout);

    if (debug) {
      return NextResponse.json({ data: enriched, _debug: debugLog });
    }
    return NextResponse.json({ data: enriched });
  } catch (err: any) {
    // Falha silenciosa — log para debug, retorna vazio
    console.error("ScentRev proxy error:", err?.message || err);
    return NextResponse.json({ data: [], debug: err?.message || "unknown error" });
  }
}
