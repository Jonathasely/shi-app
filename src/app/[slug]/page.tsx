import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import EventExperience from "@/components/EventExperience";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Buscar evento pelo slug
  const { data: evento } = await supabase
    .from("eventos")
    .select("*")
    .eq("slug", slug)
    .in("status", ["ativo", "agendado"])
    .single();

  if (!evento) {
    notFound();
  }

  // Buscar essências do evento
  const { data: eventoEssencias } = await supabase
    .from("evento_essencias")
    .select("essencia_id, essencias(*)")
    .eq("evento_id", evento.id)
    .order("ordem");

  const essencias = (eventoEssencias || [])
    .map((ee: any) => ee.essencias)
    .filter(Boolean);

  return (
    <EventExperience
      evento={{
        id: evento.id,
        nome: evento.nome,
        tipo: evento.tipo,
        data: evento.data,
        senha: evento.senha,
      }}
      essencias={essencias}
    />
  );
}
