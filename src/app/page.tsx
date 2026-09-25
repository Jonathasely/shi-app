import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { data: evento } = await supabase
    .from("eventos")
    .select("slug")
    .eq("status", "ativo")
    .order("data", { ascending: true })
    .limit(1)
    .single();

  if (evento?.slug) {
    redirect(`/${evento.slug}`);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 min-h-screen">
      <div className="font-serif text-5xl tracking-[6px] mb-2">SHI</div>
      <div className="text-[10px] font-light text-muted tracking-[4px] uppercase mb-12">
        Aroma Lab
      </div>
      <p className="text-sm text-muted font-light leading-relaxed max-w-[240px]">
        Nenhum evento ativo no momento.
        <br />
        Escaneie o QR Code no evento para começar.
      </p>
    </div>
  );
}
