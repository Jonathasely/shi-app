"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { perfumes as DB } from "@/data/perfumes";
import { findBestBase, findTopBases, generatePassportCode } from "@/lib/algorithm";
import type { Perfume, Base, ProfileResult } from "@/lib/algorithm";

/* ─── Brand palette ────────────────────────────────────────── */
const C = {
  bg: "#F5EFE8",
  white: "#FFFFFF",
  card: "#F9F7F6",
  alt: "#F0EDE8",
  border: "#E0DFDE",
  dark: "#2D2B29",
  g1: "#4A4845",
  g2: "#898888",
  g3: "#AEADAC",
  g4: "#C8C6C5",
  g5: "#E0DFDE",
};
const serif = "'Cormorant Garamond', Georgia, serif";

/** Format base code for display: "SHI-03" → "SHI Nº 03" */
function formatBaseCode(code: string): string {
  const m = code.match(/(\d+)/);
  if (m) return `SHI Nº ${m[1].padStart(2, "0")}`;
  return code;
}

/* ─── Shared styles ────────────────────────────────────────── */
const btnP: React.CSSProperties = {
  width: "100%",
  padding: "16px",
  border: "none",
  borderRadius: 0,
  background: C.dark,
  color: C.card,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "2.5px",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "all .2s",
};
const btnS: React.CSSProperties = {
  ...btnP,
  background: "transparent",
  color: C.g2,
  border: `1px solid ${C.border}`,
};
const inp: React.CSSProperties = {
  width: "100%",
  padding: "13px 0",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid ${C.border}`,
  color: C.dark,
  fontSize: 16,
  borderRadius: 0,
  boxSizing: "border-box",
  fontFamily: "inherit",
  outline: "none",
};
const lbl: React.CSSProperties = {
  fontSize: 10,
  color: C.g2,
  letterSpacing: "2px",
  textTransform: "uppercase",
  marginBottom: 4,
  display: "block",
};

/* ─── Components ───────────────────────────────────────────── */
function Logo({ size }: { size: "lg" | "md" | "sm" }) {
  const s = size === "lg" ? 52 : size === "sm" ? 26 : 38;
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: serif,
          fontSize: s,
          fontWeight: 400,
          color: C.dark,
          letterSpacing: 6,
          lineHeight: 1,
        }}
      >
        SHI
      </div>
      <div
        style={{
          fontSize: Math.max(s * 0.2, 9),
          fontWeight: 300,
          color: C.g2,
          letterSpacing: 4,
          textTransform: "uppercase",
          marginTop: 3,
        }}
      >
        Aroma Lab
      </div>
    </div>
  );
}

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: "16px 0 12px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 5,
            height: 5,
            borderRadius: 3,
            background: i === current ? C.dark : C.g5,
            transition: "all .3s",
          }}
        />
      ))}
    </div>
  );
}

function Divider() {
  return <div style={{ width: 36, height: 0.5, background: C.g4, margin: "0 auto" }} />;
}

/* ─── Event types ──────────────────────────────────────────── */
interface EventData {
  id: string;
  name: string;
  slug: string;
  password: string;
  status: string;
  selected_bases: string[];
}

type Screen = "welcome" | "register" | "search" | "analyzing" | "result" | "passport";

/* ─── CSS animations (injected once) ──────────────────────── */
const animCSS = `
@keyframes shi-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes shi-spinR{from{transform:rotate(360deg)}to{transform:rotate(0)}}
@keyframes shi-fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes shi-pulse{0%,100%{opacity:.3}50%{opacity:.9}}
@keyframes shi-scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
`;

/* ═══════════════════════════════════════════════════════════ */
export default function EventoPage() {
  const params = useParams();
  const slug = params.slug as string;

  /* ── state ───────────────────────────────────────────── */
  const [screen, setScreen] = useState<Screen>("welcome");
  const [fade, setFade] = useState(true);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // Auth
  const [evtPass, setEvtPass] = useState("");
  const [evtErr, setEvtErr] = useState(false);

  // Register — 4 fields
  const [formName, setFormName] = useState("");
  const [formSurname, setFormSurname] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formMkt, setFormMkt] = useState(false);

  // Search
  const [slots, setSlots] = useState<(Perfume | null)[]>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState(-1);
  const [searchVal, setSearchVal] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Analyzing
  const [step, setStep] = useState(0);

  // Result
  const [results, setResults] = useState<{ base: Base; score: number }[]>([]);
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null);
  const [passportCode, setPassportCode] = useState("");

  // Bases from DB
  const [bases, setBases] = useState<Base[]>([]);

  /* ── navigation ──────────────────────────────────────── */
  const go = useCallback((s: Screen) => {
    setFade(false);
    setTimeout(() => {
      setScreen(s);
      setFade(true);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, 250);
  }, []);

  /* ── load event + bases ──────────────────────────────── */
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .single();

      if (!data) {
        setPageError("expired");
      } else {
        setEvent({
          ...data,
          selected_bases: Array.isArray(data.selected_bases) ? data.selected_bases : [],
        });
      }
      setLoading(false);
    }

    async function loadBases() {
      const { data } = await supabase
        .from("bases")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (data) {
        setBases(
          data.map((b: Record<string, unknown>) => ({
            ...b,
            accords: typeof b.accords === "string" ? JSON.parse(b.accords as string) : b.accords || [],
          })) as Base[]
        );
      }
    }

    load();
    loadBases();
  }, [slug]);

  /* ── focus search when slot activated ────────────────── */
  useEffect(() => {
    if (activeSlot >= 0 && searchInputRef.current) searchInputRef.current.focus();
  }, [activeSlot]);

  /* ── analyzing animation ─────────────────────────────── */
  useEffect(() => {
    if (screen !== "analyzing") return;
    setStep(0);
    const ts = [800, 1600, 2400].map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    const fin = setTimeout(() => go("result"), 3400);
    return () => {
      ts.forEach(clearTimeout);
      clearTimeout(fin);
    };
  }, [screen, go]);

  /* ── derived ─────────────────────────────────────────── */
  const filledCount = slots.filter(Boolean).length;
  const filtered =
    searchVal.length >= 2
      ? DB.filter(
          (p) =>
            (p.name.toLowerCase().includes(searchVal.toLowerCase()) ||
              p.brand.toLowerCase().includes(searchVal.toLowerCase())) &&
            !slots.find((s) => s && s.id === p.id)
        ).slice(0, 6)
      : [];

  /* ── handlers ────────────────────────────────────────── */
  const handlePass = useCallback(async () => {
    if (!event) return;
    if (evtPass.toUpperCase() === event.password.toUpperCase()) {
      setEvtErr(false);
      go("register");
    } else {
      setEvtErr(true);
    }
  }, [event, evtPass, go]);

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

  const analyze = useCallback(async () => {
    const selected = slots.filter(Boolean) as Perfume[];
    if (selected.length !== 3 || bases.length === 0) return;

    const eventBaseIds = event?.selected_bases || [];

    // Get top 3 bases for result display
    const top3 = findTopBases(selected, bases, eventBaseIds, 3);
    setResults(top3);

    // Get full profile result for passport
    const profile = findBestBase(selected, bases, eventBaseIds);
    setProfileResult(profile);

    const code = generatePassportCode();
    setPassportCode(code);

    // Save to database
    if (event) {
      await supabase.from("participants").insert({
        event_id: event.id,
        name: formName,
        surname: formSurname,
        email: formEmail || null,
        phone: formPhone || null,
        selected_perfumes: selected.map((p) => ({ name: p.name, brand: p.brand })),
        accord_profile: profile.top_accords,
        result_base_id: profile.base.id,
        result_profile_name: profile.profile_name,
        result_profile_description: profile.profile_description,
        result_accords: profile.top_accords,
        passport_code: code,
      });
    }

    go("analyzing");
  }, [slots, bases, event, formName, formSurname, formEmail, formPhone, go]);

  const reset = () => {
    setSlots([null, null, null]);
    setSearchVal("");
    setEvtPass("");
    setFormName("");
    setFormSurname("");
    setFormEmail("");
    setFormPhone("");
    setFormMkt(false);
    setResults([]);
    setProfileResult(null);
    go("welcome");
  };

  /* ── frame (mobile fullscreen) ───────────────────────── */
  const frame: React.CSSProperties = {
    width: "100%",
    minHeight: "100vh",
    background: C.bg,
    display: "flex",
    flexDirection: "column",
  };

  /* ═══════════════════ RENDER ═════════════════════════ */

  // Loading
  if (loading) {
    return (
      <div style={{ ...frame, justifyContent: "center", alignItems: "center" }}>
        <Logo size="lg" />
      </div>
    );
  }

  // Expired / not found
  if (pageError === "expired" || !event) {
    return (
      <div style={{ ...frame, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Logo size="lg" />
        <div style={{ fontFamily: serif, fontSize: 20, color: C.g1, marginTop: 24, textAlign: "center" }}>
          Esta experiência foi encerrada
        </div>
        <div style={{ fontSize: 13, color: C.g2, marginTop: 8, textAlign: "center", maxWidth: 240 }}>
          Obrigado por participar.
        </div>
      </div>
    );
  }

  return (
    <div style={frame}>
      <style dangerouslySetInnerHTML={{ __html: animCSS }} />
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            padding: "0 24px",
            opacity: fade ? 1 : 0,
            transition: "opacity .25s ease",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ═══════ WELCOME ═══════ */}
          {screen === "welcome" && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                padding: "16px 8px",
              }}
            >
              <div style={{ fontSize: 10, letterSpacing: 4, color: C.g3, textTransform: "uppercase", marginBottom: 8 }}>
                Experiência Olfativa
              </div>
              <div
                style={{
                  fontFamily: serif,
                  fontSize: 20,
                  color: C.g1,
                  fontWeight: 400,
                  lineHeight: 1.4,
                  marginBottom: 16,
                }}
              >
                {event.name}
              </div>
              <Divider />
              <div style={{ margin: "24px 0" }}>
                <Logo size="lg" />
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: C.g2,
                  lineHeight: 1.8,
                  maxWidth: 240,
                  marginBottom: 28,
                  fontWeight: 300,
                }}
              >
                Descubra qual fragrância
                <br />
                combina com você
              </div>
              <div style={{ width: "100%", maxWidth: 260, marginBottom: 16 }}>
                <div style={lbl}>Senha do evento</div>
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePass();
                  }}
                  style={{
                    ...inp,
                    textAlign: "center",
                    letterSpacing: 4,
                    textTransform: "uppercase",
                  }}
                />
                {evtErr && (
                  <div style={{ color: "#B85C4D", fontSize: 11, marginTop: 8 }}>Senha incorreta</div>
                )}
              </div>
              <button onClick={handlePass} style={{ ...btnP, maxWidth: 260 }}>
                Entrar
              </button>
            </div>
          )}

          {/* ═══════ REGISTER ═══════ */}
          {screen === "register" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 0 24px" }}>
              <Dots current={0} total={4} />
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <Logo size="sm" />
                <div
                  style={{
                    marginTop: 14,
                    fontFamily: serif,
                    fontSize: 22,
                    color: C.dark,
                    fontWeight: 400,
                  }}
                >
                  Queremos te conhecer
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
                <div>
                  <div style={lbl}>Seu nome</div>
                  <input
                    type="text"
                    autoComplete="given-name"
                    placeholder="Como podemos te chamar?"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={inp}
                  />
                </div>
                <div>
                  <div style={lbl}>Sobrenome</div>
                  <input
                    type="text"
                    autoComplete="family-name"
                    placeholder="Seu sobrenome"
                    value={formSurname}
                    onChange={(e) => setFormSurname(e.target.value)}
                    style={inp}
                  />
                </div>
                <div>
                  <div style={lbl}>E-mail</div>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    style={inp}
                  />
                </div>
                <div>
                  <div style={lbl}>Telefone</div>
                  <input
                    type="tel"
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    style={inp}
                  />
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.g3, lineHeight: 1.7, marginTop: 16 }}>
                Seus dados registram sua experiência e perfil olfativo.
              </div>
              <div
                onClick={() => setFormMkt(!formMkt)}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  cursor: "pointer",
                  padding: "12px 0",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    marginTop: 1,
                    border: formMkt ? `1.5px solid ${C.dark}` : `1.5px solid ${C.g4}`,
                    background: formMkt ? C.dark : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all .2s",
                  }}
                >
                  {formMkt && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ fontSize: 11, color: C.g2, lineHeight: 1.5 }}>
                  Quero receber novidades e experiências da SHI.
                </div>
              </div>
              <button
                onClick={() => {
                  if (formName.trim() && formSurname.trim() && formEmail.trim() && formPhone.trim()) {
                    go("search");
                  }
                }}
                style={{
                  ...btnP,
                  marginTop: 4,
                  opacity:
                    formName.trim() && formSurname.trim() && formEmail.trim() && formPhone.trim() ? 1 : 0.4,
                }}
              >
                Começar experiência
              </button>
            </div>
          )}

          {/* ═══════ SEARCH ═══════ */}
          {screen === "search" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 0 24px" }}>
              <Dots current={1} total={4} />
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div
                  style={{
                    fontFamily: serif,
                    fontSize: 18,
                    color: C.dark,
                    fontWeight: 400,
                    lineHeight: 1.4,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Escolha seus perfumes
                </div>
                <div style={{ fontSize: 12, color: C.g2, marginTop: 8, fontWeight: 300 }}>
                  Selecione exatamente 3 fragrâncias que você ama
                </div>
              </div>

              {/* 3 slot cards */}
              <div style={{ display: "flex", gap: 10, marginBottom: 12, justifyContent: "center" }}>
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
                    style={{
                      width: 100,
                      height: 110,
                      border: activeSlot === i ? `2px solid ${C.dark}` : `1.5px solid ${s ? C.border : C.g5}`,
                      background: s ? C.white : C.alt,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      position: "relative",
                      padding: 6,
                      transition: "all .2s",
                    }}
                  >
                    {s ? (
                      <>
                        <div
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            background: C.dark,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>✕</span>
                        </div>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{s.emoji || "🌸"}</div>
                        <div
                          style={{
                            fontSize: 10,
                            color: C.dark,
                            fontWeight: 500,
                            textAlign: "center",
                            lineHeight: 1.3,
                          }}
                        >
                          {s.name}
                        </div>
                        <div style={{ fontSize: 8, color: C.g2, textAlign: "center", marginTop: 2 }}>
                          {s.brand}
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            border: `1.5px solid ${C.g4}`,
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ color: C.g3, fontSize: 14, lineHeight: 1 }}>+</span>
                        </div>
                        <div style={{ fontSize: 9, color: C.g3, letterSpacing: 1 }}>Perfume {i + 1}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                  justifyContent: "center",
                }}
              >
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 24,
                        height: 3,
                        borderRadius: 2,
                        background: i < filledCount ? C.dark : C.g5,
                        transition: "all .3s",
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: filledCount >= 3 ? C.dark : C.g2,
                    fontWeight: filledCount >= 3 ? 600 : 400,
                  }}
                >
                  {filledCount === 0
                    ? "Selecione seus perfumes"
                    : filledCount === 1
                    ? "Bom começo!"
                    : filledCount === 2
                    ? "Quase lá!"
                    : "Excelente! Precisão máxima"}
                </span>
              </div>

              {/* Search panel (when slot active) */}
              {activeSlot >= 0 && (
                <div style={{ animation: "shi-fadeUp .25s ease", flex: 1 }}>
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
                    style={{
                      ...inp,
                      borderBottom: `1.5px solid ${C.dark}`,
                      fontSize: 14,
                      padding: "12px 0",
                    }}
                  />
                  {searchVal.length >= 2 && filtered.length === 0 && (
                    <div style={{ textAlign: "center", padding: 16, color: C.g3, fontSize: 12 }}>
                      Nenhum resultado para &ldquo;{searchVal}&rdquo;
                    </div>
                  )}
                  <div style={{ maxHeight: 280, overflowY: "auto" }}>
                    {filtered.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => selectPerfume(p)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "11px 0",
                          borderBottom: `0.5px solid ${C.g5}`,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            background: C.alt,
                            border: `1px solid ${C.g5}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{p.emoji || p.name[0]}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 13, color: C.dark }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: C.g2, fontWeight: 300 }}>{p.brand}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {searchVal.length < 2 && (
                    <div style={{ textAlign: "center", fontSize: 10, color: C.g4, marginTop: 10 }}>
                      Digite para buscar
                    </div>
                  )}
                </div>
              )}

              {/* Notes section */}
              {filledCount > 0 && activeSlot < 0 && (
                <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: 12, marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: 2,
                      color: C.g2,
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Notas dos seus perfumes
                  </div>
                  {(["top", "mid", "base"] as const).map((tier) => {
                    const names: Record<string, string> = {
                      top: "Topo 🌿",
                      mid: "Coração ❤️",
                      base: "Base 🪵",
                    };
                    const allN = [
                      ...new Set(
                        slots
                          .filter(Boolean)
                          .flatMap((s) => (s!.notes && s!.notes[tier]) || [])
                      ),
                    ];
                    if (!allN.length) return null;
                    return (
                      <div key={tier} style={{ marginBottom: 6 }}>
                        <div
                          style={{
                            fontSize: 9,
                            color: C.g3,
                            letterSpacing: 1.5,
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                        >
                          {names[tier]}
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {allN.map((n, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: 10,
                                color: C.g1,
                                background: C.alt,
                                border: `0.5px solid ${C.g5}`,
                                padding: "3px 8px",
                                borderRadius: 12,
                                fontWeight: 300,
                              }}
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Analyze button */}
              {filledCount >= 1 && activeSlot < 0 && (
                <div style={{ marginTop: "auto" }}>
                  <button
                    onClick={analyze}
                    style={{ ...btnP, opacity: filledCount === 3 ? 1 : 0.4 }}
                    disabled={filledCount !== 3}
                  >
                    Descobrir meu perfil
                  </button>
                  {filledCount < 3 && (
                    <div style={{ textAlign: "center", fontSize: 10, color: C.g3, marginTop: 6 }}>
                      {filledCount === 1
                        ? "Adicione mais para maior precisão"
                        : "Mais um para precisão máxima!"}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════ ANALYZING ═══════ */}
          {screen === "analyzing" && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              {/* Spinning nested squares */}
              <div style={{ position: "relative", width: 120, height: 120, marginBottom: 40 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      inset: i * 13,
                      border: `0.5px solid rgba(45,43,41,${0.15 - i * 0.03})`,
                      animation: `${i % 2 === 0 ? "shi-spin" : "shi-spinR"} ${6 + i * 2}s linear infinite`,
                    }}
                  />
                ))}
                <div
                  style={{
                    position: "absolute",
                    inset: 42,
                    background: "rgba(45,43,41,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontFamily: serif, fontSize: 18, color: C.dark }}>S</span>
                </div>
              </div>
              {["Analisando suas escolhas", "Identificando acordes", "Mapeando perfil olfativo", "Encontrando seu SHI"].map(
                (m, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      fontWeight: 300,
                      color: i <= step ? C.g1 : C.g5,
                      marginBottom: 7,
                      transition: "color .4s",
                    }}
                  >
                    {m}
                    {i === step && <span style={{ animation: "shi-pulse 1s infinite" }}> …</span>}
                  </div>
                )
              )}
              <div style={{ display: "flex", gap: 3, marginTop: 24 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 22,
                      height: 1.5,
                      background: i <= step ? C.dark : C.g5,
                      transition: "background .4s",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ═══════ RESULT ═══════ */}
          {screen === "result" && results.length > 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 0 24px" }}>
              <Dots current={2} total={4} />
              <div style={{ animation: "shi-fadeUp .6s ease", flex: 1, display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 10,
                    letterSpacing: 3,
                    color: C.g2,
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  Seu perfil olfativo
                </div>

                {/* Main result card */}
                <div
                  style={{
                    border: `1px solid ${C.border}`,
                    padding: "28px 18px",
                    textAlign: "center",
                    position: "relative",
                    marginBottom: 16,
                    background: C.white,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -8,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: C.bg,
                      padding: "0 10px",
                      fontSize: 9,
                      letterSpacing: 3,
                      color: C.g3,
                    }}
                  >
                    RESULTADO PRINCIPAL
                  </div>
                  <div
                    style={{
                      fontFamily: serif,
                      fontSize: 26,
                      color: C.dark,
                      fontWeight: 400,
                      letterSpacing: 2,
                      marginBottom: 8,
                      lineHeight: 1.2,
                    }}
                  >
                    {results[0].base.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.g2,
                      letterSpacing: 1.5,
                      marginBottom: 20,
                      fontWeight: 300,
                    }}
                  >
                    {results[0].base.description}
                  </div>
                  <Divider />
                  <div style={{ marginTop: 20 }}>
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 3,
                        color: C.g3,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Sua fragrância
                    </div>
                    <div
                      style={{
                        fontFamily: serif,
                        fontSize: 28,
                        color: C.dark,
                        fontWeight: 400,
                        letterSpacing: 2,
                      }}
                    >
                      {formatBaseCode(results[0].base.code)}
                    </div>
                    <div style={{ fontSize: 10, color: C.g2, marginTop: 4 }}>
                      {Math.round(results[0].score * 100)}% de afinidade
                    </div>
                  </div>
                </div>

                {/* Description */}
                {profileResult && (
                  <div
                    style={{
                      padding: "12px 0",
                      borderTop: `.5px solid ${C.g5}`,
                      borderBottom: `.5px solid ${C.g5}`,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ fontSize: 13, color: C.g1, lineHeight: 1.8, fontWeight: 300 }}>
                      {profileResult.profile_description}
                    </div>
                  </div>
                )}

                {/* Alternatives */}
                {results.length > 1 && (
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: 2,
                        color: C.g3,
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Também combina com você
                    </div>
                    {results.slice(1).map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          border: `.5px solid ${C.g5}`,
                          background: C.white,
                          marginBottom: 4,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: C.dark }}>{formatBaseCode(r.base.code)}</div>
                          <div style={{ fontSize: 11, color: C.g2, fontWeight: 300, marginTop: 1 }}>
                            {r.base.name}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: C.g3 }}>{Math.round(r.score * 100)}%</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected perfumes tags */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: 2,
                      color: C.g3,
                      textTransform: "uppercase",
                      marginBottom: 8,
                      textAlign: "center",
                    }}
                  >
                    Seus perfumes
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                    {slots.filter(Boolean).map((p) => (
                      <span
                        key={p!.id}
                        style={{
                          fontSize: 11,
                          color: C.g1,
                          background: C.alt,
                          border: `0.5px solid ${C.g5}`,
                          padding: "4px 12px",
                          borderRadius: 14,
                          fontWeight: 300,
                        }}
                      >
                        {p!.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ marginTop: "auto" }}>
                  <button onClick={() => go("passport")} style={btnP}>
                    Passaporte Olfativo
                  </button>
                  <button onClick={reset} style={{ ...btnS, marginTop: 8 }}>
                    Início
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ PASSPORT ═══════ */}
          {screen === "passport" && results.length > 0 && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "0 0 24px",
              }}
            >
              <Dots current={3} total={4} />
              <div
                style={{
                  textAlign: "center",
                  animation: "shi-scaleIn .5s ease",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    border: `1px solid ${C.border}`,
                    padding: "32px 18px 24px",
                    position: "relative",
                    background: C.white,
                  }}
                >
                  {/* Corner decorations */}
                  {[
                    { top: 0, left: 0 },
                    { top: 0, right: 0 },
                    { bottom: 0, left: 0 },
                    { bottom: 0, right: 0 },
                  ].map((pos, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        ...pos,
                        width: 14,
                        height: 14,
                        borderTop: "top" in pos && pos.top === 0 ? `1.5px solid ${C.g3}` : "none",
                        borderBottom: "bottom" in pos && pos.bottom === 0 ? `1.5px solid ${C.g3}` : "none",
                        borderLeft: "left" in pos && pos.left === 0 ? `1.5px solid ${C.g3}` : "none",
                        borderRight: "right" in pos && pos.right === 0 ? `1.5px solid ${C.g3}` : "none",
                      } as React.CSSProperties}
                    />
                  ))}

                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: 4,
                      color: C.g3,
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Passaporte Olfativo
                  </div>
                  <Logo size="md" />
                  <div style={{ width: 30, height: 0.5, background: C.g4, margin: "16px auto" }} />
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: 2,
                      color: C.g2,
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    {formName} {formSurname}
                  </div>
                  <div
                    style={{
                      fontFamily: serif,
                      fontSize: 22,
                      color: C.dark,
                      fontWeight: 400,
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    {results[0].base.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.g2,
                      letterSpacing: 1,
                      fontWeight: 300,
                      marginBottom: 20,
                    }}
                  >
                    {results[0].base.description}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      border: `1px solid ${C.border}`,
                      padding: "12px 24px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        letterSpacing: 3,
                        color: C.g3,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Sua fragrância
                    </div>
                    <div
                      style={{
                        fontFamily: serif,
                        fontSize: 20,
                        color: C.dark,
                        fontWeight: 400,
                        letterSpacing: 2,
                      }}
                    >
                      {formatBaseCode(results[0].base.code)}
                    </div>
                  </div>

                  {/* Selected perfume tags */}
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
                    {slots.filter(Boolean).map((p) => (
                      <span
                        key={p!.id}
                        style={{
                          fontSize: 10,
                          color: C.g1,
                          background: C.alt,
                          border: `0.5px solid ${C.g5}`,
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontWeight: 300,
                        }}
                      >
                        {p!.name}
                      </span>
                    ))}
                  </div>

                  <div style={{ marginTop: 16, fontSize: 9, color: C.g4 }}>{event.name}</div>
                </div>

                {/* Buttons */}
                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                  <button style={{ ...btnS, flex: 1, fontSize: 10, letterSpacing: 1.5 }}>
                    Compartilhar
                  </button>
                  <button onClick={reset} style={{ ...btnS, flex: 1, fontSize: 10, letterSpacing: 1.5 }}>
                    Início
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
