/**
 * SHI Aroma Lab — Cosine Similarity Algorithm
 * Matches user perfume selections to SHI Bases
 * Runs 100% client-side, no API dependency
 */

export interface Accord {
  name: string;
  value: number;
}

export interface Perfume {
  id: string;
  name: string;
  brand: string;
  accords: Accord[];
}

export interface Base {
  id: string;
  code: string;
  name: string;
  description: string;
  family: string;
  accords: Accord[];
}

export interface ProfileResult {
  base: Base;
  score: number;
  profile_name: string;
  profile_description: string;
  top_accords: Accord[];
}

/**
 * Build an accord vector from selected perfumes.
 * Each accord is averaged across all selected perfumes.
 */
function buildAccordProfile(perfumes: Perfume[]): Record<string, number> {
  const accordMap: Record<string, number[]> = {};

  for (const perfume of perfumes) {
    for (const accord of perfume.accords) {
      if (!accordMap[accord.name]) {
        accordMap[accord.name] = [];
      }
      accordMap[accord.name].push(accord.value);
    }
  }

  const profile: Record<string, number> = {};
  for (const [name, values] of Object.entries(accordMap)) {
    profile[name] = values.reduce((a, b) => a + b, 0) / perfumes.length;
  }

  return profile;
}

/**
 * Cosine similarity between two accord vectors.
 */
function cosineSimilarity(
  a: Record<string, number>,
  b: Record<string, number>
): number {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const key of allKeys) {
    const va = a[key] || 0;
    const vb = b[key] || 0;
    dotProduct += va * vb;
    magA += va * va;
    magB += vb * vb;
  }

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Convert a Base's accords array to a record.
 */
function baseToVector(base: Base): Record<string, number> {
  const vec: Record<string, number> = {};
  for (const accord of base.accords) {
    vec[accord.name] = accord.value;
  }
  return vec;
}

/**
 * Main function: match selected perfumes to the best SHI Base.
 */
export function findBestBase(
  selectedPerfumes: Perfume[],
  bases: Base[]
): ProfileResult {
  const userProfile = buildAccordProfile(selectedPerfumes);

  // Score each base
  const scores = bases.map((base) => ({
    base,
    score: cosineSimilarity(userProfile, baseToVector(base)),
  }));

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];

  // Get top accords from user profile
  const topAccords = Object.entries(userProfile)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Generate profile description
  const topAccordNames = topAccords.slice(0, 3).map((a) => a.name.toLowerCase());
  const profileDescription = `Você tende a gostar de fragrâncias com notas ${topAccordNames.join(", ")}. Sua assinatura olfativa combina perfeitamente com ${best.base.name}.`;

  return {
    base: best.base,
    score: Math.round(best.score * 100),
    profile_name: best.base.name,
    profile_description: profileDescription,
    top_accords: topAccords,
  };
}

/**
 * Generate a unique passport code.
 */
export function generatePassportCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SHI-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
