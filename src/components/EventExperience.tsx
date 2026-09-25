"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Essencia } from "@/lib/supabase";
import { cosineSimilarity, averageAccords, AccordVector } from "@/lib/algorithm";

// ============================================================
// Base de perfumes locais para busca (protótipo)
// Na versão com Fragella, isso vem da API
// ============================================================
const PERFUME_DB = [
  { id: 1, name: "Light Blue", brand: "Dolce & Gabbana", accords: { citrus: 100, fresh: 100, aromatic: 70, green: 70, "white floral": 40, musky: 15 } },
  { id: 2, name: "Coco Mademoiselle", brand: "Chanel", accords: { citrus: 100, "fresh spicy": 70, floral: 70, woody: 70, amber: 40, musky: 40 } },
  { id: 3, name: "Allure", brand: "Chanel", accords: { floral: 100, powdery: 70, "fresh spicy": 70, woody: 40, citrus: 40 } },
  { id: 4, name: "J'adore", brand: "Dior", accords: { floral: 100, fruity: 70, sweet: 70, musky: 40, woody: 15 } },
  { id: 5, name: "Paradoxe", brand: "Prada", accords: { floral: 100, amber: 70, musky: 70, sweet: 40, woody: 40 } },
  { id: 6, name: "La Vie Est Belle", brand: "Lancôme", accords: { sweet: 100, gourmand: 100, floral: 70, fruity: 70, powdery: 40 } },
  { id: 7, name: "Good Girl Blush", brand: "Carolina Herrera", accords: { floral: 100, sweet: 70, fruity: 70, powdery: 40, musky: 40 } },
  { id: 8, name: "Libre", brand: "Yves Saint Laurent", accords: { floral: 100, woody: 70, amber: 70, citrus: 40, musky: 40 } },
  { id: 9, name: "Delina", brand: "Parfums de Marly", accords: { floral: 100, sweet: 70, fruity: 70, musky: 40, rose: 40 } },
  { id: 10, name: "Idôle", brand: "Lancôme", accords: { floral: 100, musky: 70, fresh: 70, woody: 40, powdery: 40 } },
  { id: 11, name: "Scandal", brand: "Jean Paul Gaultier", accords: { sweet: 100, honey: 100, floral: 70, amber: 40, woody: 40 } },
  { id: 12, name: "CH L'Eau", brand: "Carolina Herrera", accords: { fresh: 100, citrus: 70, floral: 70, green: 40, fruity: 40 } },
  { id: 13, name: "212 VIP", brand: "Carolina Herrera", accords: { floral: 100, fruity: 70, sweet: 70, musky: 40, amber: 40 } },
  { id: 14, name: "Miss Dior", brand: "Dior", accords: { floral: 100, fresh: 70, citrus: 70, woody: 40, musky: 40 } },
  { id: 15, name: "Baccarat Rouge 540", brand: "MFK", accords: { amber: 100, sweet: 100, woody: 70, "warm spicy": 40, floral: 15 } },
  { id: 16, name: "Fame", brand: "Paco Rabanne", accords: { sweet: 100, musky: 70, floral: 70, woody: 40, amber: 40 } },
  { id: 17, name: "Amber Romance", brand: "Victoria's Secret", accords: { amber: 100, sweet: 100, vanilla: 70, musky: 40 } },
  { id: 18, name: "Vanilla", brand: "Victoria's Secret", accords: { sweet: 100, vanilla: 100, musky: 70, powdery: 40 } },
  { id: 19, name: "Mango Temptation", brand: "Victoria's Secret", accords: { fruity: 100, sweet: 100, tropical: 70, musky: 40 } },
  { id: 20, name: "Chloé", brand: "Chloé", accords: { floral: 100, rose: 100, powdery: 70, fresh: 40, citrus: 40 } },
  { id: 21, name: "Chance Eau Tendre", brand: "Chanel", accords: { floral: 100, fresh: 70, fruity: 70, musky: 40, citrus: 40 } },
  { id: 22, name: "Black Opium", brand: "YSL", accords: { sweet: 100, vanilla: 70, woody: 70, amber: 40, "warm spicy": 40 } },
  { id: 23, name: "Flowerbomb", brand: "Viktor & Rolf", accords: { sweet: 100, floral: 100, powdery: 70, amber: 40 } },
  { id: 24, name: "Good Girl", brand: "Carolina Herrera", accords: { sweet: 100, woody: 70, floral: 70, amber: 40 } },
  { id: 25, name: "Si", brand: "Giorgio Armani", accords: { sweet: 100, fruity: 70, floral: 70, musky: 40 } },
  { id: 26, name: "Mon Paris", brand: "YSL", accords: { sweet: 100, fruity: 70, floral: 70, amber: 40 } },
  { id: 27, name: "My Way", brand: "Giorgio Armani", accords: { floral: 100, musky: 70, fresh: 70, woody: 40 } },
  { id: 28, name: "Daisy", brand: "Marc Jacobs", accords: { floral: 100, fresh: 70, fruity: 70, green: 40 } },
  { id: 29, name: "N°5", brand: "Chanel", accords: { floral: 100, powdery: 70, aldehyde: 70, woody: 40 } },
  { id: 30, name: "Bombshell", brand: "Victoria's Secret", accords: { fruity: 100, floral: 70, fresh: 70, citrus: 40 } },
];

type Perfume = (typeof PERFUME_DB)[number];

interface Props {
  evento: {
    id: string;
    nome: string;
    tipo: string;
    data: string;
    senha: string;
  };
  essencias: Essencia[];
}

interface ResultItem {
  essencia_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  descricao_longa: string | null;
  score: number;
}

export default function EventExperience({ evento, essencias }: Props) {
  // ── Screens: welcome → register → search → analyzing → result → passport
  const [screen, setScreen] = useState<string>("welcome");
  const [fade, setFade] = useState(true);

  // ── Form state
  const [evtPass, setEvtPass] = useState("");
  const [evtErr, setEvtErr] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formWA, setFormWA] = useState("");
  const [formMkt, setFormMkt] = useState(false);

  // ── Perfume selection
  const [slots, setSlots] = useState<(Perfume | null)[]>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState(-1);
  const [searchVal, setSearchVal] = useState("");

  // ── Results
  const [step, setStep] = useState(0);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const go = useCallback((s: string) => {
    setFade(false);
    setTimeout(() => {
      setScreen(s);
      setFade(true);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, 250);
  }, []);

  // ── Analyzing animation
  useEffect(() => {
    if (screen !== "analyzing") return;
    setStep(0);
    const timers = [800, 1600, 2400].map((ms, i) =>
      setTimeout(() => setStep(i + 1), ms)
    );
    const finish = setTimeout(() => submitAndGetResults(), 3400);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finish);
    };
  }, [screen]);

  // ── Focus search input
  useEffect(() => {
    if (activeSlot >= 0 && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeSlot]);

  const filledCount = slots.filter(Boolean).length;

  const filtered =
    searchVal.length >= 2
      ? PERFUME_DB.filter(
          (p) =>
            (p.name.toLowerCase().includes(searchVal.toLowerCase()) ||
              p.brand.toLowerCase().includes(searchVal.toLowerCase())) &&
            !slots.find((s) => s && s.id === p.id)
        ).slice(0, 6)
      : [];

  const selectPerfume = (p: Perfume) => {
    const ns = [...slots];
    ns[activeSlot] = p;
    setSlots(ns);
    setActiveSlot(-1);
    setSearchVal("");
  };

  const removeSlot = (i: number) => {
    const ns = [...slots];
    ns[i] = null;
    setSlots(ns);
  };

  const handlePass = () => {
    if (evtPass.toUpperCase() === evento.senha.toUpperCase()) {
      setEvtErr(false);
      go("register");
    } else {
      setEvtErr(true);
    }
  };

  const submitAndGetResults = async () => {
    setSaving(true);
    const selected = slots.filter(Boolean) as Perfume[];
    const accordVectors = selected.map(
      (p) => p.accords as unknown as AccordVector
    );

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento_id: evento.id,
          nome: formName,
          email: formEmail || null,
          whatsapp: formWA || null,
          perfumes: selected.map((p) => ({ name: p.name, brand: p.brand })),
          marketing_consent: formMkt,
          perfume_accords: accordVectors,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      } else {
        // Fallback: calcular localmente
        localRecommend(accordVectors);
      }
    } catch {
      // Fallback: calcular localmente
      localRecommend(accordVectors);
    }

    setSaving(false);
    go("result");
  };

  const localRecommend = (accordVectors: AccordVector[]) => {
    const avg = averageAccords(accordVectors);
    const scored = essencias
      .map((e) => ({
        essencia_id: e.id,
        codigo: e.codigo,
        nome: e.nome,
        descricao: e.descricao,
        descricao_longa: e.descricao_longa,
        score: Math.round(cosineSimilarity(avg, e.acordes) * 100),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    setResults(scored);
  };

  const reset = () => {
    setSlots([null, null, null]);
    setSearchVal("");
    setEvtPass("");
    setFormName("");
    setFormEmail("");
    setFormWA("");
    setFormMkt(false);
    setResults([]);
    go("welcome");
  };

  // ── Formatted event date
  const eventDate = new Date(evento.data + "T12:00:00").toLocaleDateString(
    "pt-BR",
    { day: "2-digit", month: "2-digit", year: "numeric" }
  );

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF8] px-0 py-0 md:bg-[#F0EDE8] md:py-5">
      <div className="w-full max-w-[400px] min-h-screen md:min-h-0 md:h-[780px] md:rounded-[44px] md:border md:border-[#E8E4DF] md:shadow-[0_20px_80px_rgba(0,0,0,0.08)] bg-[#FAFAF8] flex flex-col overflow-hidden">
        {/* Spacer for rounded top on desktop */}
        <div className="hidden md:block h-11 flex-shrink-0" />

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
        >
          <div
            className="px-6 md:px-7 flex-1 flex flex-col transition-opacity duration-250"
            style={{ opacity: fade ? 1 : 0 }}
          >
            {/* ═══ WELCOME ═══ */}
            {screen === "welcome" && (
              <div className="flex-1 flex flex-col justify-center items-center text-center py-4 px-2">
                <div className="text-[10px] tracking-[4px] text-[#AAA] uppercase mb-2">
                  Experiência Olfativa
                </div>
                <div className="font-serif text-xl text-[#555] font-normal leading-snug mb-4">
                  {evento.nome}
                </div>
                <Divider />
                <div className="my-6">
                  <Logo size="lg" />
                </div>
                <div className="text-[13px] text-[#888] leading-[1.8] max-w-[240px] mb-7 font-light">
                  Descubra qual fragrância
                  <br />
                  combina com você
                </div>
                <div className="w-full max-w-[260px] mb-4">
                  <Label>Senha do evento</Label>
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="Digite a senha"
                    value={evtPass}
                    onChange={(e) => {
                      setEvtPass(e.target.value);
                      setEvtErr(false);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handlePass()}
                    className="w-full bg-transparent border-0 border-b border-[#E8E4DF] text-center tracking-[4px] uppercase text-[#1A1A1A] py-3 text-base focus:outline-none focus:border-[#1A1A1A] transition-colors"
                  />
                  {evtErr && (
                    <div className="text-[#C0392B] text-[11px] mt-2">
                      Senha incorreta
                    </div>
                  )}
                </div>
                <BtnPrimary onClick={handlePass} className="max-w-[260px]">
                  Entrar
                </BtnPrimary>
              </div>
            )}

            {/* ═══ REGISTER ═══ */}
            {screen === "register" && (
              <div className="flex-1 flex flex-col pb-6">
                <Dots current={0} total={4} />
                <div className="text-center mb-6">
                  <Logo size="sm" />
                  <div className="mt-3 font-serif text-[22px] font-normal">
                    Queremos te conhecer
                  </div>
                </div>
                <div className="flex flex-col gap-[18px] flex-1">
                  <Field label="Seu nome">
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="Como podemos te chamar?"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="input-shi"
                    />
                  </Field>
                  <Field label="E-mail">
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="input-shi"
                    />
                  </Field>
                  <Field label="WhatsApp">
                    <input
                      type="tel"
                      autoComplete="tel"
                      placeholder="(00) 00000-0000"
                      value={formWA}
                      onChange={(e) => setFormWA(e.target.value)}
                      className="input-shi"
                    />
                  </Field>
                </div>
                <div className="text-[10px] text-[#AAA] leading-[1.7] mt-4">
                  Seus dados registram sua experiência e perfil olfativo.
                </div>
                <div
                  onClick={() => setFormMkt(!formMkt)}
                  className="flex gap-2.5 items-start cursor-pointer py-3"
                >
                  <div
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 border-[1.5px] flex items-center justify-center transition-all ${
                      formMkt
                        ? "border-[#1A1A1A] bg-[#1A1A1A]"
                        : "border-[#CCC] bg-transparent"
                    }`}
                  >
                    {formMkt && (
                      <span className="text-white text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#888] leading-snug">
                    Quero receber novidades e experiências da SHI.
                  </div>
                </div>
                <BtnPrimary onClick={() => go("search")} className="mt-1">
                  Começar experiência
                </BtnPrimary>
              </div>
            )}

            {/* ═══ SEARCH / PERFUME SELECTION ═══ */}
            {screen === "search" && (
              <div className="flex-1 flex flex-col pb-6">
                <Dots current={1} total={4} />
                <div className="text-center mb-4">
                  <div className="font-serif text-lg font-normal leading-snug uppercase tracking-[1px]">
                    Quais são seus perfumes preferidos?
                  </div>
                  <div className="text-xs text-[#888] mt-2 font-light">
                    Selecione de 1 a 3 fragrâncias que você ama
                  </div>
                </div>

                {/* Slots */}
                <div className="flex gap-2.5 mb-3 justify-center">
                  {slots.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        if (s) removeSlot(i);
                        else {
                          setActiveSlot(i);
                          setSearchVal("");
                        }
                      }}
                      className={`w-[100px] h-[110px] flex flex-col items-center justify-center cursor-pointer relative p-1.5 transition-all ${
                        activeSlot === i
                          ? "border-2 border-[#1A1A1A]"
                          : s
                          ? "border-[1.5px] border-[#E8E4DF]"
                          : "border-[1.5px] border-[#E8E4DF] bg-[#F4F1ED]"
                      } ${s ? "bg-white" : ""}`}
                    >
                      {s ? (
                        <>
                          <div className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full bg-[#1A1A1A] flex items-center justify-center">
                            <span className="text-white text-[9px] font-bold">
                              ✕
                            </span>
                          </div>
                          <div className="text-[10px] font-medium text-center leading-tight">
                            {s.name}
                          </div>
                          <div className="text-[8px] text-[#888] text-center mt-0.5">
                            {s.brand}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-6 h-6 border-[1.5px] border-[#CCC] rounded-full flex items-center justify-center mb-1">
                            <span className="text-[#AAA] text-sm leading-none">
                              +
                            </span>
                          </div>
                          <div className="text-[9px] text-[#AAA] tracking-[1px]">
                            Perfume {i + 1}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 mb-3 justify-center">
                  <div className="flex gap-[3px]">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`w-6 h-[3px] rounded-sm transition-all ${
                          i < filledCount ? "bg-[#1A1A1A]" : "bg-[#E8E4DF]"
                        }`}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-[10px] ${
                      filledCount >= 3
                        ? "text-[#1A1A1A] font-semibold"
                        : "text-[#888]"
                    }`}
                  >
                    {filledCount === 0
                      ? "Selecione"
                      : filledCount === 1
                      ? "Bom começo!"
                      : filledCount === 2
                      ? "Quase lá!"
                      : "Precisão máxima"}
                  </span>
                </div>

                {/* Search area */}
                {activeSlot >= 0 && (
                  <div className="animate-fade-up flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      enterKeyHint="search"
                      placeholder="Buscar perfume ou marca..."
                      value={searchVal}
                      onChange={(e) => setSearchVal(e.target.value)}
                      className="w-full bg-transparent border-0 border-b-[1.5px] border-[#1A1A1A] py-3 text-sm focus:outline-none"
                    />
                    {searchVal.length >= 2 && filtered.length === 0 && (
                      <div className="text-center p-4 text-[#AAA] text-xs">
                        Nenhum resultado para &ldquo;{searchVal}&rdquo;
                      </div>
                    )}
                    <div className="max-h-[280px] overflow-y-auto">
                      {filtered.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => selectPerfume(p)}
                          className="flex items-center gap-3 py-[11px] border-b border-[#E8E4DF]/50 cursor-pointer"
                        >
                          <div className="w-[38px] h-[38px] bg-[#F4F1ED] border border-[#E8E4DF] flex items-center justify-center flex-shrink-0">
                            <span className="font-serif text-[15px] text-[#AAA]">
                              {p.name[0]}
                            </span>
                          </div>
                          <div>
                            <div className="text-[13px]">{p.name}</div>
                            <div className="text-[10px] text-[#888] font-light">
                              {p.brand}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {searchVal.length < 2 && (
                      <div className="text-center text-[10px] text-[#CCC] mt-2.5">
                        Digite para buscar
                      </div>
                    )}
                  </div>
                )}

                {/* Submit button */}
                {filledCount >= 1 && activeSlot < 0 && (
                  <div className="mt-auto">
                    <BtnPrimary onClick={() => go("analyzing")}>
                      Descobrir meu perfil
                    </BtnPrimary>
                    {filledCount < 3 && (
                      <div className="text-center text-[10px] text-[#AAA] mt-1.5">
                        {filledCount === 1
                          ? "Adicione mais para maior precisão"
                          : "Mais um para precisão máxima!"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══ ANALYZING ═══ */}
            {screen === "analyzing" && (
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <div className="relative w-[120px] h-[120px] mb-10">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="absolute border-[0.5px]"
                      style={{
                        inset: i * 13,
                        borderColor: `rgba(26,26,26,${0.15 - i * 0.03})`,
                        animation: `${i % 2 === 0 ? "spin" : "spinR"} ${
                          6 + i * 2
                        }s linear infinite`,
                      }}
                    />
                  ))}
                  <div className="absolute inset-[42px] bg-[rgba(26,26,26,0.04)] flex items-center justify-center">
                    <span className="font-serif text-lg">S</span>
                  </div>
                </div>
                {[
                  "Analisando suas escolhas",
                  "Identificando acordes",
                  "Mapeando perfil olfativo",
                  "Encontrando seu SHI",
                ].map((m, i) => (
                  <div
                    key={i}
                    className={`text-xs font-light mb-[7px] transition-colors duration-400 ${
                      i <= step ? "text-[#555]" : "text-[#E8E4DF]"
                    }`}
                  >
                    {m}
                    {i === step && (
                      <span style={{ animation: "pulse 1s infinite" }}>
                        {" "}
                        …
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex gap-[3px] mt-6">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-[22px] h-[1.5px] transition-colors duration-400 ${
                        i <= step ? "bg-[#1A1A1A]" : "bg-[#E8E4DF]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ═══ RESULT ═══ */}
            {screen === "result" && results.length > 0 && (
              <div className="flex-1 flex flex-col pb-6">
                <Dots current={2} total={4} />
                <div className="animate-fade-up flex-1 flex flex-col">
                  <div className="text-center text-[10px] tracking-[3px] text-[#888] uppercase mb-4">
                    Seu perfil olfativo
                  </div>

                  {/* Main result card */}
                  <div className="border border-[#E8E4DF] p-7 text-center relative mb-4 bg-white">
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#FAFAF8] px-2.5 text-[9px] tracking-[3px] text-[#AAA]">
                      RESULTADO PRINCIPAL
                    </div>
                    <div className="font-serif text-[26px] tracking-[2px] mb-2 leading-tight">
                      {results[0].nome}
                    </div>
                    <div className="text-[11px] text-[#888] tracking-[1.5px] mb-5 font-light">
                      {results[0].descricao}
                    </div>
                    <Divider />
                    <div className="mt-5">
                      <div className="text-[9px] tracking-[3px] text-[#AAA] uppercase mb-1">
                        Sua fragrância
                      </div>
                      <div className="font-serif text-[28px] tracking-[2px]">
                        {results[0].codigo}
                      </div>
                      <div className="text-[10px] text-[#888] mt-1">
                        {results[0].score}% de afinidade
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {results[0].descricao_longa && (
                    <div className="py-3 border-t border-b border-[#E8E4DF]/50 mb-4">
                      <div className="text-[13px] text-[#555] leading-[1.8] font-light">
                        {results[0].descricao_longa}
                      </div>
                    </div>
                  )}

                  {/* Alternatives */}
                  {results.length > 1 && (
                    <div className="mb-4">
                      <div className="text-[10px] tracking-[2px] text-[#AAA] uppercase mb-2">
                        Também combina com você
                      </div>
                      {results.slice(1).map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-2.5 px-3 border border-[#E8E4DF]/50 bg-white mb-1"
                        >
                          <div>
                            <div className="text-xs font-medium">
                              {r.codigo}
                            </div>
                            <div className="text-[11px] text-[#888] font-light mt-0.5">
                              {r.nome}
                            </div>
                          </div>
                          <div className="text-[11px] text-[#AAA]">
                            {r.score}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto">
                    <BtnPrimary onClick={() => go("passport")}>
                      Passaporte Olfativo
                    </BtnPrimary>
                    <BtnSecondary onClick={reset} className="mt-2">
                      Início
                    </BtnSecondary>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ PASSPORT ═══ */}
            {screen === "passport" && results.length > 0 && (
              <div className="flex-1 flex flex-col justify-center pb-6">
                <Dots current={3} total={4} />
                <div className="text-center animate-scale-in flex-1 flex flex-col justify-center">
                  <div className="border border-[#E8E4DF] py-8 px-[18px] relative bg-white">
                    {/* Corner decorations */}
                    {[
                      "top-0 left-0 border-t border-l",
                      "top-0 right-0 border-t border-r",
                      "bottom-0 left-0 border-b border-l",
                      "bottom-0 right-0 border-b border-r",
                    ].map((cls, i) => (
                      <div
                        key={i}
                        className={`absolute w-3.5 h-3.5 border-[#AAA] ${cls}`}
                      />
                    ))}

                    <div className="text-[9px] tracking-[4px] text-[#AAA] uppercase mb-1.5">
                      Passaporte Olfativo
                    </div>
                    <Logo />
                    <div className="w-[30px] h-px bg-[#CCC] mx-auto my-4" />
                    <div className="text-[11px] tracking-[2px] text-[#888] uppercase mb-3">
                      {formName || "Convidada"}
                    </div>
                    <div className="font-serif text-[22px] tracking-[1px] mb-1">
                      {results[0].nome}
                    </div>
                    <div className="text-[11px] text-[#888] tracking-[1px] font-light mb-5">
                      {results[0].descricao}
                    </div>
                    <div className="inline-block border border-[#E8E4DF] py-3 px-6">
                      <div className="text-[9px] tracking-[3px] text-[#AAA] uppercase mb-1">
                        Sua fragrância
                      </div>
                      <div className="font-serif text-xl tracking-[2px]">
                        {results[0].codigo}
                      </div>
                    </div>
                    <div className="mt-4 text-[9px] text-[#CCC]">
                      {evento.nome} • {eventDate}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <BtnSecondary className="flex-1 !text-[10px] !tracking-[1.5px]">
                      Compartilhar
                    </BtnSecondary>
                    <BtnSecondary
                      onClick={reset}
                      className="flex-1 !text-[10px] !tracking-[1.5px]"
                    >
                      Início
                    </BtnSecondary>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════

function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "text-[52px]" : size === "sm" ? "text-[26px]" : "text-[38px]";
  const sub = size === "lg" ? "text-[10px]" : size === "sm" ? "text-[7px]" : "text-[9px]";
  return (
    <div className="text-center">
      <div className={`font-serif ${s} font-normal tracking-[6px] leading-none`}>
        SHI
      </div>
      <div className={`${sub} font-light text-[#888] tracking-[4px] uppercase mt-[3px]`}>
        Aroma Lab
      </div>
    </div>
  );
}

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center py-4 pb-3">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-[5px] rounded-[3px] transition-all duration-300 ${
            i === current ? "w-5 bg-[#1A1A1A]" : "w-[5px] bg-[#E8E4DF]"
          }`}
        />
      ))}
    </div>
  );
}

function Divider() {
  return <div className="w-9 h-px bg-[#CCC] mx-auto" />;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-[#888] tracking-[2px] uppercase mb-1">
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function BtnPrimary({
  onClick,
  children,
  className = "",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-4 bg-[#1A1A1A] text-white text-[11px] font-semibold tracking-[2.5px] uppercase transition-all hover:bg-[#333] ${className}`}
    >
      {children}
    </button>
  );
}

function BtnSecondary({
  onClick,
  children,
  className = "",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-4 bg-transparent border border-[#E8E4DF] text-[#888] text-[11px] font-semibold tracking-[2.5px] uppercase transition-all hover:border-[#1A1A1A] hover:text-[#1A1A1A] ${className}`}
    >
      {children}
    </button>
  );
}
