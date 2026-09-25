import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>)

// ============================================================
// Types
// ============================================================

export interface Essencia {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  descricao_longa: string | null
  categoria: string | null
  acordes: Record<string, number>
  ativa: boolean
}

export interface Ingrediente {
  id: string
  nome: string
  categoria: string | null
  descricao: string | null
  unidade: string
  ativo: boolean
}

export interface Evento {
  id: string
  nome: string
  tipo: string
  data: string
  horario: string | null
  local: string | null
  endereco: string | null
  capacidade: number
  senha: string
  status: string
  slug: string | null
  observacoes: string | null
}

export interface Participante {
  id: string
  evento_id: string
  nome: string
  email: string | null
  whatsapp: string | null
  perfumes: { name: string; brand: string }[]
  marketing_consent: boolean
  essencia_recomendada_id: string | null
  score_recomendacao: number | null
  essencia_escolhida_id: string | null
}

export interface Combinacao {
  id: string
  participante_id: string
  base_essencia_id: string
  base_ml: number
  observacoes: string | null
}

export interface CombinacaoItem {
  id: string
  combinacao_id: string
  ingrediente_id: string
  quantidade: number
}
