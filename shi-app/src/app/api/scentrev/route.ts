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
  salty: "Salgado", "warm spicy": "Especiado Quente", "fresh spicy": "Especiado Fresco",
  "white floral": "Floral Branco",
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  if (!search.trim()) {
    return NextResponse.json({ data: [] });
  }

  if (!API_KEY) {
    return NextResponse.json({ data: [], error: "ScentRev API key not configured" });
  }

  try {
    // Timeout de 4s para não travar a busca
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const result = await callMcpTool(
      "search_fragrances",
      { query: search },
      controller.signal
    );

    clearTimeout(timeout);

    const items = extractPerfumes(result);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const perfumes = items.slice(0, 10).map((item: any) => {
      // Mapear acordes — ScentRev retorna 0-100 (ou 0-1 que convertemos)
      let accords: { name: string; value: number }[] = [];
      if (item.accords) {
        if (Array.isArray(item.accords)) {
          accords = item.accords.map((a: any) => ({
            name: translateAccord(a.name || a.accord || ""),
            // Se valor entre 0-1, multiplicar por 100
            value: typeof a.value === "number"
              ? (a.value <= 1 ? Math.round(a.value * 100) : Math.round(a.value))
              : typeof a.percentage === "number"
                ? Math.round(a.percentage)
                : typeof a.strength === "number"
                  ? (a.strength <= 1 ? Math.round(a.strength * 100) : Math.round(a.strength))
                  : 50,
          }));
        } else if (typeof item.accords === "object") {
          accords = Object.entries(item.accords).map(([name, val]: [string, any]) => ({
            name: translateAccord(name),
            value: typeof val === "number"
              ? (val <= 1 ? Math.round(val * 100) : Math.round(val))
              : 50,
          }));
        }
      }

      // Mapear notas
      const notes = item.notes || item.note_pyramid || {};
      const mapNotes = (arr: any): string[] => {
        if (!arr) return [];
        if (Array.isArray(arr)) {
          return arr.map((n: any) => translateNote(typeof n === "string" ? n : n.name || ""));
        }
        return [];
      };

      return {
        id: item.slug || item.id || item.name || "",
        name: item.name || item.fragrance || "",
        brand: item.brand || item.house || "",
        image: item.image || item.imageUrl || item.image_url || "",
        accords,
        notes: {
          top: mapNotes(notes.top),
          heart: mapNotes(notes.heart || notes.mid || notes.middle),
          base: mapNotes(notes.base || notes.bottom),
        },
      };
    });

    return NextResponse.json({ data: perfumes });
  } catch (err: any) {
    // Falha silenciosa — log para debug, retorna vazio
    console.error("ScentRev proxy error:", err?.message || err);
    return NextResponse.json({ data: [], debug: err?.message || "unknown error" });
  }
}
