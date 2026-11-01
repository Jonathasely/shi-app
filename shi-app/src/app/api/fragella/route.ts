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

/* Tradução de accords EN → PT para match com as bases do Supabase */
const ACCORD_PT: Record<string, string> = {
  floral: "Floral",
  sweet: "Doce",
  woody: "Amadeirado",
  fresh: "Fresco",
  citrus: "Cítrico",
  fruity: "Frutado",
  musky: "Musk",
  powdery: "Empolvado",
  warm: "Quente",
  spicy: "Especiado",
  aromatic: "Aromático",
  amber: "Âmbar",
  vanilla: "Baunilha",
  leather: "Couro",
  smoky: "Defumado",
  aquatic: "Aquático",
  green: "Verde",
  oriental: "Oriental",
  balsamic: "Balsâmico",
  herbal: "Herbal",
  earthy: "Terroso",
  gourmand: "Gourmand",
  oud: "Oud",
  rose: "Rosa",
  tropical: "Tropical",
  mossy: "Musgoso",
  ozonic: "Ozônico",
  creamy: "Cremoso",
  nutty: "Avelã",
  animalic: "Animalic",
  soapy: "Ensaboado",
  patchouli: "Patchouli",
  lavender: "Lavanda",
  marine: "Marinho",
  aldehydic: "Aldeídico",
  tobacco: "Tabaco",
  cinnamon: "Canela",
  coconut: "Coco",
  honey: "Mel",
  iris: "Íris",
  jasmine: "Jasmim",
  soft: "Suave",
  metallic: "Metálico",
  "warm spicy": "Especiado Quente",
  "fresh spicy": "Especiado Fresco",
  "white floral": "Floral Branco",
  "yellow floral": "Floral Amarelo",
  "sweet floral": "Floral Doce",
};

/* Tradução de notas EN → PT */
const NOTE_PT: Record<string, string> = {
  // Cítricas
  "bergamot": "Bergamota", "lemon": "Limão", "orange": "Laranja", "grapefruit": "Toranja",
  "mandarin orange": "Tangerina", "lime": "Lima", "blood orange": "Laranja Sanguínea",
  "tangerine": "Tangerina", "yuzu": "Yuzu", "citron": "Cidra", "kumquat": "Kumquat",
  "bitter orange": "Laranja Amarga", "sicilian lemon": "Limão Siciliano",
  "italian lemon": "Limão Italiano", "lemon verbena": "Verbena Limão",
  "calabrian bergamot": "Bergamota Calabresa", "pink grapefruit": "Toranja Rosa",
  "green mandarin": "Tangerina Verde", "petit grain": "Petitgrain",

  // Florais
  "rose": "Rosa", "jasmine": "Jasmim", "iris": "Íris", "violet": "Violeta",
  "lily": "Lírio", "tuberose": "Tuberosa", "magnolia": "Magnólia", "orchid": "Orquídea",
  "peony": "Peônia", "freesia": "Frésia", "gardenia": "Gardênia", "carnation": "Cravo",
  "neroli": "Neroli", "ylang-ylang": "Ylang-Ylang", "ylang ylang": "Ylang-Ylang",
  "geranium": "Gerânio", "osmanthus": "Osmanto", "champaca": "Champaca",
  "mimosa": "Mimosa", "wisteria": "Glicínia", "hibiscus": "Hibisco", "lotus": "Lótus",
  "frangipani": "Frangipani", "heliotrope": "Heliotrópio", "orange blossom": "Flor de Laranjeira",
  "cherry blossom": "Flor de Cerejeira", "lily of the valley": "Lírio do Vale",
  "white rose": "Rosa Branca", "red rose": "Rosa Vermelha", "bulgarian rose": "Rosa Búlgara",
  "turkish rose": "Rosa Turca", "damascus rose": "Rosa Damascena", "damask rose": "Rosa Damascena",
  "may rose": "Rosa de Maio", "wild rose": "Rosa Selvagem", "sambac jasmine": "Jasmim Sambac",
  "indian jasmine": "Jasmim Indiano", "egyptian jasmine": "Jasmim Egípcio",
  "water lily": "Lírio d'Água", "white lily": "Lírio Branco", "madonna lily": "Lírio Madonna",
  "lavender": "Lavanda", "french lavender": "Lavanda Francesa", "honeysuckle": "Madressilva",
  "acacia": "Acácia", "marigold": "Calêndula", "hyacinth": "Jacinto",
  "plumeria": "Plumeria", "tiare flower": "Flor de Tiaré", "linden blossom": "Flor de Tília",
  "magnolia leaf": "Folha de Magnólia", "white flowers": "Flores Brancas",
  "night blooming jasmine": "Jasmim da Noite", "daffodil": "Narciso",

  // Frutadas
  "apple": "Maçã", "peach": "Pêssego", "pear": "Pera", "plum": "Ameixa",
  "cherry": "Cereja", "raspberry": "Framboesa", "strawberry": "Morango",
  "blueberry": "Mirtilo", "blackberry": "Amora", "blackcurrant": "Groselha Negra",
  "red currant": "Groselha Vermelha", "cranberry": "Cranberry", "fig": "Figo",
  "pomegranate": "Romã", "quince": "Marmelo", "apricot": "Damasco",
  "mango": "Manga", "papaya": "Mamão", "guava": "Goiaba", "lychee": "Lichia",
  "passion fruit": "Maracujá", "pineapple": "Abacaxi", "coconut": "Coco",
  "melon": "Melão", "watermelon": "Melancia", "banana": "Banana", "kiwi": "Kiwi",
  "grape": "Uva", "cassis": "Cassis", "green apple": "Maçã Verde",
  "red apple": "Maçã Vermelha", "red berries": "Frutas Vermelhas",
  "wild berries": "Frutas Silvestres", "tropical fruits": "Frutas Tropicais",
  "black cherry": "Cereja Negra", "sour cherry": "Cereja Ácida",
  "dried fruits": "Frutas Secas", "candied fruits": "Frutas Cristalizadas",
  "citrus fruits": "Frutas Cítricas", "elderberry": "Sabugueiro",

  // Especiarias
  "pepper": "Pimenta", "black pepper": "Pimenta Preta", "pink pepper": "Pimenta Rosa",
  "white pepper": "Pimenta Branca", "sichuan pepper": "Pimenta Sichuan",
  "cinnamon": "Canela", "cardamom": "Cardamomo", "clove": "Cravo-da-Índia",
  "nutmeg": "Noz-Moscada", "saffron": "Açafrão", "ginger": "Gengibre",
  "cumin": "Cominho", "coriander": "Coentro", "anise": "Anis", "star anise": "Anis Estrelado",
  "fennel": "Funcho", "turmeric": "Cúrcuma", "paprika": "Páprica",
  "chili pepper": "Pimenta Chili", "juniper berries": "Bagas de Zimbro",
  "caraway": "Alcaravia", "elemi": "Elemi",

  // Amadeiradas
  "sandalwood": "Sândalo", "cedar": "Cedro", "cedarwood": "Madeira de Cedro",
  "oud": "Oud", "agarwood": "Oud", "vetiver": "Vetiver", "patchouli": "Patchouli",
  "guaiac wood": "Guaiaco", "birch": "Bétula", "oak": "Carvalho",
  "pine": "Pinho", "cypress": "Cipreste", "bamboo": "Bambu",
  "rosewood": "Pau-Rosa", "driftwood": "Madeira Flutuante", "teak": "Teca",
  "ebony": "Ébano", "mahogany": "Mogno", "cashmeran": "Cashmeran",
  "hinoki": "Hinoki", "texas cedar": "Cedro do Texas", "virginia cedar": "Cedro da Virgínia",
  "atlas cedar": "Cedro Atlas", "white cedar": "Cedro Branco",
  "mysore sandalwood": "Sândalo de Mysore", "australian sandalwood": "Sândalo Australiano",

  // Resinas e Balsâmicos
  "amber": "Âmbar", "incense": "Incenso", "frankincense": "Olíbano",
  "myrrh": "Mirra", "benzoin": "Benjoim", "labdanum": "Ládano",
  "copal": "Copal", "resin": "Resina", "balsam": "Bálsamo",
  "peru balsam": "Bálsamo do Peru", "tolu balsam": "Bálsamo de Tolu",
  "styrax": "Estoraque", "opoponax": "Opoponax",

  // Gourmand
  "vanilla": "Baunilha", "chocolate": "Chocolate", "coffee": "Café",
  "caramel": "Caramelo", "honey": "Mel", "almond": "Amêndoa",
  "hazelnut": "Avelã", "pistachio": "Pistache", "praline": "Praliné",
  "toffee": "Toffee", "cocoa": "Cacau", "dark chocolate": "Chocolate Amargo",
  "white chocolate": "Chocolate Branco", "milk chocolate": "Chocolate ao Leite",
  "sugar": "Açúcar", "brown sugar": "Açúcar Mascavo", "cotton candy": "Algodão Doce",
  "marshmallow": "Marshmallow", "whipped cream": "Chantilly", "cream": "Creme",
  "milk": "Leite", "butter": "Manteiga", "rum": "Rum", "cognac": "Conhaque",
  "whiskey": "Whiskey", "wine": "Vinho", "champagne": "Champanhe",
  "absinthe": "Absinto", "licorice": "Alcaçuz",

  // Almiscarados e Animálicos
  "musk": "Almíscar", "white musk": "Almíscar Branco", "ambergris": "Âmbar Cinza",
  "civet": "Civeta", "castoreum": "Castóreo", "leather": "Couro",
  "suede": "Camurça", "animalic notes": "Notas Animálicas",

  // Verdes e Herbáceas
  "green notes": "Notas Verdes", "grass": "Grama", "basil": "Manjericão",
  "mint": "Menta", "peppermint": "Hortelã-Pimenta", "spearmint": "Hortelã",
  "thyme": "Tomilho", "rosemary": "Alecrim", "sage": "Sálvia",
  "eucalyptus": "Eucalipto", "tea": "Chá", "green tea": "Chá Verde",
  "black tea": "Chá Preto", "white tea": "Chá Branco", "mate": "Mate",
  "tarragon": "Estragão", "dill": "Endro", "parsley": "Salsinha",
  "bay leaf": "Louro", "fig leaf": "Folha de Figueira",
  "tomato leaf": "Folha de Tomate", "violet leaf": "Folha de Violeta",
  "ivy": "Hera", "moss": "Musgo", "oakmoss": "Musgo de Carvalho",
  "tree moss": "Musgo de Árvore", "seaweed": "Algas", "clary sage": "Sálvia Esclareia",
  "artemisia": "Artemísia", "chamomile": "Camomila",
  "marijuana": "Maconha", "hemp": "Cânhamo", "rhubarb": "Ruibarbo",
  "watercress": "Agrião", "celery": "Aipo",

  // Aquáticas e Ozônicas
  "sea water": "Água do Mar", "marine notes": "Notas Marinhas",
  "aquatic notes": "Notas Aquáticas", "ocean": "Oceano", "rain": "Chuva",
  "ozone": "Ozônio", "salt": "Sal", "sea salt": "Sal Marinho",
  "ambroxan": "Ambroxan", "calone": "Calone",

  // Terrosas e Defumadas
  "tobacco": "Tabaco", "smoke": "Fumaça", "smoky notes": "Notas Defumadas",
  "earth": "Terra", "wet earth": "Terra Molhada", "petrichor": "Petrichor",
  "mushroom": "Cogumelo", "truffle": "Trufa", "peat": "Turfa",
  "birch tar": "Alcatrão de Bétula",

  // Musks sintéticos e moléculas
  "iso e super": "Iso E Super", "ambrette": "Ambrette", "tonka bean": "Fava Tonka",
  "coumarin": "Cumarina", "mastic": "Mástique", "orris": "Orris",
  "orris root": "Raiz de Íris", "hedione": "Hedione",

  // Outros comuns
  "powder": "Pó", "powdery notes": "Notas Empolvadas",
  "cotton": "Algodão", "silk": "Seda", "cashmere": "Cashmere",
  "metal": "Metal", "ink": "Tinta", "paper": "Papel",
  "wax": "Cera", "beeswax": "Cera de Abelha",
  "aldehydes": "Aldeídos",
  "woody notes": "Notas Amadeiradas", "warm spicy": "Especiado Quente",
  "fresh spicy": "Especiado Fresco", "sweet": "Doce", "bitter": "Amargo",
  "sour": "Ácido", "dry": "Seco", "clean": "Limpo",
  "warm": "Quente", "cool": "Frio", "fresh": "Fresco",
  "soft": "Suave", "sharp": "Agudo", "bright": "Brilhante",
  "dark": "Escuro", "light": "Leve", "rich": "Rico",
  "deep": "Profundo", "smooth": "Aveludado",
  "airy": "Aéreo", "crisp": "Crocante", "sparkling": "Efervescente",

  // Notas adicionais
  "cacao pod": "Vagem de Cacau", "cacao": "Cacau",
  "coconut milk": "Leite de Coco", "coconut water": "Água de Coco",
  "rice": "Arroz", "soy milk": "Leite de Soja",
  "sesame": "Gergelim", "poppy": "Papoula",
  "dandelion": "Dente-de-Leão", "clover": "Trevo",
  "heather": "Urze", "thistle": "Cardo",
  "palm leaf": "Folha de Palmeira", "banana leaf": "Folha de Banana",
  "coconut nectar": "Néctar de Coco",
  "date": "Tâmara", "prune": "Ameixa Seca",
  "cactus": "Cacto", "agave": "Agave",
  "monoi oil": "Óleo de Monoï", "argan": "Argan",
  "shea": "Karité", "olive": "Oliva",
  "davana": "Davana", "tagetes": "Tagetes",
  "liquor": "Licor", "sake": "Saquê", "beer": "Cerveja",
  "vodka": "Vodca", "gin": "Gin", "tequila": "Tequila",
  "bourbon": "Bourbon",
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
        name: ACCORD_PT[name.toLowerCase()] || name,
        value: ACCORD_PERCENT[pctObj[name]] || 50,
      }));

      // Notes: object with top/heart/base arrays of {name, image}
      const notes = item.notes || item.Notes || {};
      const translateNote = (name: string) => NOTE_PT[name.toLowerCase()] || name;
      const topNotes = (notes.top || notes.Top || []).map((n: any) => ({
        name: translateNote(n.name || n.Name || ""),
        image: n.image || n.imageUrl || "",
      }));
      const heartNotes = (notes.heart || notes.Middle || []).map((n: any) => ({
        name: translateNote(n.name || n.Name || ""),
        image: n.image || n.imageUrl || "",
      }));
      const baseNotes = (notes.base || notes.Base || []).map((n: any) => ({
        name: translateNote(n.name || n.Name || ""),
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
