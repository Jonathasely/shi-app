import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { recommend, AccordVector } from "@/lib/algorithm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      evento_id,
      nome,
      email,
      whatsapp,
      perfumes,
      marketing_consent,
      perfume_accords,
    } = body;

    // Validação básica
    if (!evento_id || !nome || !perfumes || perfumes.length === 0) {
      return NextResponse.json(
        { error: "Dados obrigatórios faltando" },
        { status: 400 }
      );
    }

    // Buscar essências do evento
    const { data: eventoEssencias } = await supabase
      .from("evento_essencias")
      .select("essencia_id, essencias(*)")
      .eq("evento_id", evento_id);

    const essencias = (eventoEssencias || [])
      .map((ee: any) => ee.essencias)
      .filter(Boolean);

    if (essencias.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma essência cadastrada para este evento" },
        { status: 400 }
      );
    }

    // Calcular recomendação
    const accordVectors: AccordVector[] = perfume_accords || [];
    const results = recommend(accordVectors, essencias, 3);

    // Salvar participante
    const { data: participante, error: insertError } = await supabase
      .from("participantes")
      .insert({
        evento_id,
        nome,
        email: email || null,
        whatsapp: whatsapp || null,
        perfumes,
        marketing_consent: marketing_consent || false,
        essencia_recomendada_id: results[0]?.essenciaId || null,
        score_recomendacao: results[0]?.score || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Erro ao salvar participante:", insertError);
      return NextResponse.json(
        { error: "Erro ao salvar dados" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      participante_id: participante.id,
      results: results.map((r) => ({
        essencia_id: r.essenciaId,
        codigo: r.codigo,
        nome: r.nome,
        descricao: r.descricao,
        descricao_longa: r.descricaoLonga,
        score: Math.round(r.score * 100),
      })),
    });
  } catch (error) {
    console.error("Erro na recomendação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
