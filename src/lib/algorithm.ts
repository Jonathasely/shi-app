/**
 * SHI Aroma Lab — Algoritmo de Recomendação
 *
 * Usa similaridade de cosseno entre o vetor médio de acordes
 * dos perfumes selecionados pela convidada e o vetor de acordes
 * de cada essência SHI disponível no evento.
 *
 * Conversão acorde → número:
 *   Dominant = 100, Prominent = 70, Moderate = 40, Subtle = 15
 */

export interface AccordVector {
  [accord: string]: number
}

/**
 * Calcula a similaridade de cosseno entre dois vetores de acordes.
 * Retorna um valor entre 0 e 1.
 */
export function cosineSimilarity(a: AccordVector, b: AccordVector): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  keys.forEach((key) => {
    const va = a[key] || 0
    const vb = b[key] || 0
    dotProduct += va * vb
    magnitudeA += va * va
    magnitudeB += vb * vb
  })

  if (magnitudeA === 0 || magnitudeB === 0) return 0
  return dotProduct / Math.sqrt(magnitudeA * magnitudeB)
}

/**
 * Calcula o vetor médio de acordes a partir de uma lista de perfumes.
 * Cada perfume tem seu próprio vetor de acordes.
 */
export function averageAccords(perfumeAccords: AccordVector[]): AccordVector {
  if (perfumeAccords.length === 0) return {}

  const sum: AccordVector = {}
  perfumeAccords.forEach((accords) => {
    Object.entries(accords).forEach(([key, value]) => {
      sum[key] = (sum[key] || 0) + value
    })
  })

  const avg: AccordVector = {}
  const n = perfumeAccords.length
  Object.entries(sum).forEach(([key, value]) => {
    avg[key] = value / n
  })

  return avg
}

export interface EssenciaScore {
  essenciaId: string
  codigo: string
  nome: string
  descricao: string | null
  descricaoLonga: string | null
  score: number
}

/**
 * Recomenda as top N essências SHI com base nos perfumes selecionados.
 *
 * @param perfumeAccords - Vetores de acordes dos perfumes escolhidos pela convidada
 * @param essencias - Lista de essências SHI disponíveis no evento
 * @param topN - Número de resultados (padrão: 3)
 */
export function recommend(
  perfumeAccords: AccordVector[],
  essencias: {
    id: string
    codigo: string
    nome: string
    descricao: string | null
    descricao_longa: string | null
    acordes: AccordVector
  }[],
  topN: number = 3
): EssenciaScore[] {
  if (perfumeAccords.length === 0 || essencias.length === 0) return []

  const avgVector = averageAccords(perfumeAccords)

  const scores = essencias.map((essencia) => ({
    essenciaId: essencia.id,
    codigo: essencia.codigo,
    nome: essencia.nome,
    descricao: essencia.descricao,
    descricaoLonga: essencia.descricao_longa,
    score: cosineSimilarity(avgVector, essencia.acordes),
  }))

  return scores.sort((a, b) => b.score - a.score).slice(0, topN)
}
