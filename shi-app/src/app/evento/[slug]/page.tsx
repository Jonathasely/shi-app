"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { perfumes as DB } from "@/data/perfumes";
import { findBestBase, findTopBases, generatePassportCode } from "@/lib/algorithm";
import type { Perfume, Base, ProfileResult } from "@/lib/algorithm";

/* ─── Fragella API types ─── */
interface PerfumeWithImage extends Perfume {
  image?: string;
}

/* ─── Brand palette ────────────────────────────────────────── */
const C = {
  bg: "#F5EFE8",
  white: "#FFFFFF",
  card: "#F9F7F6",
  alt: "#F0EDE8",
  border: "#E0DFDE",
  dark: "#2D2B29",
  g1: "#3D3B38",
  g2: "#6B6A69",
  g3: "#8A8988",
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
  padding: "var(--shi-btn-pad)",
  border: "none",
  borderRadius: 0,
  background: C.dark,
  color: C.card,
  fontSize: "var(--shi-btn-fs)",
  fontWeight: 600,
  letterSpacing: "var(--shi-btn-ls)",
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
  padding: "var(--shi-input-pad) 0",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid ${C.border}`,
  color: C.dark,
  fontSize: "var(--shi-input)",
  borderRadius: 0,
  boxSizing: "border-box",
  fontFamily: "inherit",
  outline: "none",
};
const lbl: React.CSSProperties = {
  fontSize: "var(--shi-label)",
  color: C.g2,
  letterSpacing: "var(--shi-label-ls)",
  textTransform: "uppercase",
  marginBottom: 4,
  display: "block",
};

/* ─── Components ───────────────────────────────────────────── */
function Logo({ size }: { size: "lg" | "md" | "sm" }) {
  const s = size === "lg" ? "var(--shi-logo)" : size === "sm" ? "26px" : "var(--shi-logo-md)";
  const ls = size === "lg" ? "var(--shi-logo-ls)" : size === "sm" ? "6px" : "var(--shi-logo-md-ls)";
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: serif,
          fontSize: s,
          fontWeight: 400,
          color: C.dark,
          letterSpacing: ls,
          lineHeight: 1,
        }}
      >
        SHI
      </div>
      <div
        style={{
          fontSize: size === "lg" ? "var(--shi-logo-sub)" : size === "sm" ? "9px" : "var(--shi-logo-md-sub)",
          fontWeight: 300,
          color: C.g2,
          letterSpacing: size === "lg" ? "var(--shi-logo-sub-ls)" : "4px",
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
    <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: "var(--shi-dots-pad)" }}>
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

/** Corner decoration for cards */
function Corners() {
  return (
    <>
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
    </>
  );
}

/* ─── Event types ──────────────────────────────────────────── */
interface EventData {
  id: string;
  name: string;
  slug: string;
  password: string;
  status: string;
  selected_bases: string[];
  welcome_line1?: string;
  welcome_line2?: string;
}

type Screen = "welcome" | "register" | "search" | "analyzing" | "result" | "passport";

/* ─── Default texts ───────────────────────────────────────── */
const DEFAULT_LINE1 = "EXPERIÊNCIA OLFATIVA GUIADA POR INTELIGÊNCIA ARTIFICIAL";
const DEFAULT_LINE2 = "DESCUBRA QUAL FRAGRÂNCIA SHI COMBINA COM VOCÊ!";

/* ─── Screensaver timeout (seconds) ───────────────────────── */
const SCREENSAVER_TIMEOUT = 60;

/* ─── CSS animations (injected once) ──────────────────────── */
const animCSS = `
html,body{background:${C.bg}}
@keyframes shi-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes shi-spinR{from{transform:rotate(360deg)}to{transform:rotate(0)}}
@keyframes shi-fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes shi-pulse{0%,100%{opacity:.3}50%{opacity:.9}}
@keyframes shi-scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
@keyframes shi-fadeInSS{from{opacity:0}to{opacity:1}}

/* ── CSS Variables: valores padrão (celular) ── */
:root {
  --shi-logo:52px; --shi-logo-ls:6px; --shi-logo-sub:9px; --shi-logo-sub-ls:4px;
  --shi-logo-md:38px; --shi-logo-md-ls:6px; --shi-logo-md-sub:9px;
  --shi-welcome-sub:9px; --shi-welcome-sub-ls:3px; --shi-welcome-sub-lh:2; --shi-welcome-sub-mw:220px;
  --shi-welcome-title:22px; --shi-welcome-title-mw:280px;
  --shi-welcome-input:13px; --shi-welcome-input-pad:13px;
  --shi-btn-fs:11px; --shi-btn-pad:16px; --shi-btn-ls:2.5px; --shi-btn-mw:260px;
  --shi-label:10px; --shi-label-ls:2px;
  --shi-input:16px; --shi-input-pad:13px;
  --shi-section-title:20px;
  --shi-checkbox:11px;
  --shi-frame-mw:600px; --shi-frame-pad:24px;
  --shi-dots-pad:16px 0 12px;
  --shi-search-input:14px;
  --shi-search-name:13px; --shi-search-brand:10px;
  --shi-accord-fs:8px; --shi-accord-pad:1px 5px;
  --shi-notes-tag:10px; --shi-notes-tag-pad:3px 8px;
  --shi-notes-label:9px;
  --shi-progress-text:10px;
  --shi-slot-w:100px; --shi-slot-h:110px; --shi-slot-img:40px;
  --shi-slot-name:10px; --shi-slot-brand:8px; --shi-slot-placeholder:9px;
  --shi-analyze-text:12px; --shi-analyze-s:18px;
  --shi-result-name:28px; --shi-result-desc:11px; --shi-result-code:30px;
  --shi-result-score:11px; --shi-result-profile:12px;
  --shi-alt-code:16px; --shi-alt-name:12px; --shi-alt-score:10px;
  --shi-section-label:9px; --shi-section-label-ls:2px;
  --shi-ref-text:13px;
  --shi-passport-label:9px; --shi-passport-name:11px;
  --shi-passport-base:22px; --shi-passport-frag:20px;
  --shi-passport-ref:12px; --shi-passport-event:9px;
  --shi-cta-fs:9px;
  --shi-hint:10px;
  --shi-search-msg:12px;
  --shi-search-hint:10px;
  --shi-form-gap:18px;
  --shi-checkbox-box:18px;
  --shi-checkbox-check:10px;
}

/* ── Totem: telas altas (>900px height AND >600px width) ── */
@media (min-height:900px) and (min-width:600px) {
  :root {
    --shi-logo:96px; --shi-logo-ls:14px; --shi-logo-sub:18px; --shi-logo-sub-ls:8px;
    --shi-logo-md:64px; --shi-logo-md-ls:10px; --shi-logo-md-sub:14px;
    --shi-welcome-sub:18px; --shi-welcome-sub-ls:5px; --shi-welcome-sub-lh:2.2; --shi-welcome-sub-mw:480px;
    --shi-welcome-title:42px; --shi-welcome-title-mw:540px;
    --shi-welcome-input:22px; --shi-welcome-input-pad:22px;
    --shi-btn-fs:18px; --shi-btn-pad:24px; --shi-btn-ls:4px; --shi-btn-mw:480px;
    --shi-label:16px; --shi-label-ls:4px;
    --shi-input:24px; --shi-input-pad:22px;
    --shi-section-title:36px;
    --shi-checkbox:18px;
    --shi-frame-mw:800px; --shi-frame-pad:48px;
    --shi-dots-pad:28px 0 24px;
    --shi-search-input:24px;
    --shi-search-name:22px; --shi-search-brand:16px;
    --shi-accord-fs:14px; --shi-accord-pad:5px 12px;
    --shi-notes-tag:16px; --shi-notes-tag-pad:6px 14px;
    --shi-notes-label:15px;
    --shi-progress-text:16px;
    --shi-slot-w:180px; --shi-slot-h:190px; --shi-slot-img:70px;
    --shi-slot-name:16px; --shi-slot-brand:13px; --shi-slot-placeholder:14px;
    --shi-analyze-text:22px; --shi-analyze-s:36px;
    --shi-result-name:48px; --shi-result-desc:18px; --shi-result-code:50px;
    --shi-result-score:18px; --shi-result-profile:20px;
    --shi-alt-code:28px; --shi-alt-name:20px; --shi-alt-score:16px;
    --shi-section-label:16px; --shi-section-label-ls:4px;
    --shi-ref-text:22px;
    --shi-passport-label:16px; --shi-passport-name:20px;
    --shi-passport-base:40px; --shi-passport-frag:34px;
    --shi-passport-ref:20px; --shi-passport-event:16px;
    --shi-cta-fs:16px;
    --shi-hint:18px;
    --shi-search-msg:20px;
    --shi-search-hint:18px;
    --shi-form-gap:28px;
    --shi-checkbox-box:24px;
    --shi-checkbox-check:14px;
  }
}

/* ── Screensaver ── */
.shi-screensaver{position:fixed;inset:0;z-index:9999;background:#000;animation:shi-fadeInSS .8s ease;cursor:pointer}
.shi-screensaver video{width:100%;height:100%;object-fit:cover}
.shi-screensaver-touch{position:absolute;bottom:60px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.7);font-size:14px;letter-spacing:3px;text-transform:uppercase;font-weight:300;animation:shi-pulse 2s infinite;pointer-events:none}
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

  // Register — 4 fields + checkbox
  const [formName, setFormName] = useState("");
  const [formSurname, setFormSurname] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formMkt, setFormMkt] = useState(false);
  const [formMktErr, setFormMktErr] = useState(false);

  // Search
  const [slots, setSlots] = useState<(PerfumeWithImage | null)[]>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState(-1);
  const [searchVal, setSearchVal] = useState("");
  const [apiResults, setApiResults] = useState<PerfumeWithImage[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
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

  // Screensaver
  const [showScreensaver, setShowScreensaver] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /* ── screensaver: ativa após inatividade ────────────── */
  const resetIdleTimer = useCallback(() => {
    if (showScreensaver) setShowScreensaver(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setShowScreensaver(true);
    }, SCREENSAVER_TIMEOUT * 1000);
  }, [showScreensaver]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer(); // start timer
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

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
          welcome_line1: data.welcome_line1 || undefined,
          welcome_line2: data.welcome_line2 || undefined,
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

  /* ── Fragella API debounced search ─────────────────── */
  // Flag: ativar fallback para DB local caso API não esteja disponível
  const USE_LOCAL_FALLBACK = false;

  useEffect(() => {
    if (searchVal.length < 3) {
      setApiResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setApiLoading(true);
      try {
        const res = await fetch(`/api/fragella?search=${encodeURIComponent(searchVal)}&limit=10`);
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped: PerfumeWithImage[] = json.data.map((item: any) => ({
            id: item.id || item.name,
            name: item.name,
            brand: item.brand,
            image: item.image || item.imageTransparent || "",
            accords: item.accords || [],
            notes: {
              top: (item.notes?.top || []).map((n: any) => n.name || n),
              mid: (item.notes?.heart || []).map((n: any) => n.name || n),
              base: (item.notes?.base || []).map((n: any) => n.name || n),
            },
          }));
          setApiResults(mapped);
        } else {
          setApiResults([]);
        }
      } catch {
        // Fallback silently to local DB
        setApiResults([]);
      }
      setApiLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchVal]);

  /* ── derived ─────────────────────────────────────────── */
  const filledCount = slots.filter(Boolean).length;

  // Busca exclusiva via API. DB local só se USE_LOCAL_FALLBACK = true
  const filtered = (() => {
    if (searchVal.length < 3) return [];
    const selected = slots.filter(Boolean).map((s) => s!.id);

    // Resultados da API Fragella
    if (apiResults.length > 0) {
      return apiResults.filter((p) => !selected.includes(p.id)).slice(0, 8);
    }

    // Fallback para DB local (desativado por padrão)
    if (USE_LOCAL_FALLBACK) {
      return DB.filter(
        (p) =>
          (p.name.toLowerCase().includes(searchVal.toLowerCase()) ||
            p.brand.toLowerCase().includes(searchVal.toLowerCase())) &&
          !selected.includes(p.id)
      ).slice(0, 6);
    }

    return [];
  })();

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

  const handleRegister = () => {
    if (!formName.trim() || !formSurname.trim() || !formEmail.trim() || !formPhone.trim()) return;
    if (!formMkt) {
      setFormMktErr(true);
      return;
    }
    setFormMktErr(false);
    go("search");
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
    setFormMktErr(false);
    setResults([]);
    setProfileResult(null);
    go("welcome");
  };

  /* ── frame (mobile fullscreen, max-width for large screens) */
  const frame: React.CSSProperties = {
    width: "100%",
    maxWidth: "var(--shi-frame-mw)",
    margin: "0 auto",
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

  /* ── Welcome screen texts (admin-editable) ──────────── */
  const welcomeLine1 = event.welcome_line1 || DEFAULT_LINE1;
  const welcomeLine2 = event.welcome_line2 || DEFAULT_LINE2;

  return (
    <div style={frame}>
      <style dangerouslySetInnerHTML={{ __html: animCSS }} />

      {/* ═══════ SCREENSAVER ═══════ */}
      {showScreensaver && (
        <div
          className="shi-screensaver"
          onClick={() => setShowScreensaver(false)}
          onTouchStart={() => setShowScreensaver(false)}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            src="/screensaver1.mp4"
          />
          <div className="shi-screensaver-touch">Toque para iniciar</div>
        </div>
      )}

      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            padding: "0 var(--shi-frame-pad)",
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
              <Logo size="lg" />

              <div
                style={{
                  fontSize: "var(--shi-welcome-sub)",
                  letterSpacing: "var(--shi-welcome-sub-ls)",
                  color: C.g2,
                  textTransform: "uppercase",
                  lineHeight: "var(--shi-welcome-sub-lh)",
                  marginTop: 28,
                  marginBottom: 24,
                  maxWidth: "var(--shi-welcome-sub-mw)",
                  fontWeight: 300,
                }}
              >
                {welcomeLine1}
              </div>

              <div
                style={{
                  fontFamily: serif,
                  fontSize: "var(--shi-welcome-title)",
                  color: C.dark,
                  fontWeight: 600,
                  lineHeight: 1.4,
                  maxWidth: "var(--shi-welcome-title-mw)",
                  marginBottom: 32,
                }}
              >
                {welcomeLine2}
              </div>

              <div style={{ width: "100%", maxWidth: 260, marginBottom: 16 }}>
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="DIGITE A SENHA"
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
                    fontSize: "var(--shi-welcome-input)",
                    padding: "var(--shi-welcome-input-pad) 0",
                  }}
                />
                {evtErr && (
                  <div style={{ color: "#B85C4D", fontSize: 11, marginTop: 8 }}>Senha incorreta</div>
                )}
              </div>
              <button onClick={handlePass} style={{ ...btnP, maxWidth: "var(--shi-btn-mw)", fontSize: "var(--shi-btn-fs)", padding: "var(--shi-btn-pad)", letterSpacing: "var(--shi-btn-ls)" }}>
                Entrar
              </button>
            </div>
          )}

          {/* ═══════ REGISTER ═══════ */}
          {screen === "register" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 0 24px" }}>
              <Dots current={0} total={4} />
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <Logo size="md" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--shi-form-gap)", flex: 1 }}>
                <div>
                  <div style={lbl}>Seu nome</div>
                  <input
                    type="text"
                    autoComplete="given-name"
                    placeholder="Seu nome"
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
                    placeholder="Seu e-mail"
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
                    placeholder="Seu telefone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    style={inp}
                  />
                </div>
              </div>
              <div
                onClick={() => {
                  setFormMkt(!formMkt);
                  setFormMktErr(false);
                }}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  cursor: "pointer",
                  padding: "14px 0",
                }}
              >
                <div
                  style={{
                    width: "var(--shi-checkbox-box)",
                    height: "var(--shi-checkbox-box)",
                    flexShrink: 0,
                    marginTop: 1,
                    border: formMktErr
                      ? "1.5px solid #B85C4D"
                      : formMkt
                      ? `1.5px solid ${C.dark}`
                      : `1.5px solid ${C.g4}`,
                    background: formMkt ? C.dark : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all .2s",
                  }}
                >
                  {formMkt && <span style={{ color: "#fff", fontSize: "var(--shi-checkbox-check)", fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ fontSize: "var(--shi-checkbox)", color: formMktErr ? "#B85C4D" : C.g2, lineHeight: 1.5 }}>
                  Aceito receber comunicações, novidades e experiências exclusivas da SHI Aroma Lab por e-mail, SMS ou WhatsApp. *
                </div>
              </div>
              {formMktErr && (
                <div style={{ fontSize: 11, color: "#B85C4D", marginBottom: 8, marginTop: -4 }}>
                  Para continuar, é necessário aceitar o recebimento de comunicações.
                </div>
              )}
              <button
                onClick={handleRegister}
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
                    fontSize: "var(--shi-section-title)",
                    color: C.dark,
                    fontWeight: 400,
                    lineHeight: 1.4,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Quais seus perfumes preferidos?
                </div>
                <div style={{ fontSize: "var(--shi-checkbox)", color: C.g2, marginTop: 8, fontWeight: 300, lineHeight: 1.5 }}>
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
                      width: "var(--shi-slot-w)",
                      height: "var(--shi-slot-h)",
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
                            zIndex: 2,
                          }}
                        >
                          <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>✕</span>
                        </div>
                        {(s as PerfumeWithImage).image ? (
                          <img
                            src={(s as PerfumeWithImage).image}
                            alt={s.name}
                            style={{
                              width: "var(--shi-slot-img)",
                              height: "var(--shi-slot-img)",
                              objectFit: "contain",
                              marginBottom: 2,
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : null}
                        <div
                          style={{
                            fontSize: "var(--shi-slot-name)",
                            color: C.dark,
                            fontWeight: 500,
                            textAlign: "center",
                            lineHeight: 1.3,
                          }}
                        >
                          {s.name}
                        </div>
                        <div style={{ fontSize: "var(--shi-slot-brand)", color: C.g2, textAlign: "center", marginTop: 2 }}>
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
                        <div style={{ fontSize: "var(--shi-slot-placeholder)", color: C.g3, letterSpacing: 1 }}>Perfume {i + 1}</div>
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
                    fontSize: "var(--shi-progress-text)",
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
                      fontSize: "var(--shi-search-input)",
                      padding: "var(--shi-input-pad) 0",
                    }}
                  />
                  {searchVal.length >= 3 && apiLoading && (
                    <div style={{ textAlign: "center", padding: 16, color: C.g3, fontSize: "var(--shi-search-msg)" }}>
                      Buscando perfumes...
                    </div>
                  )}
                  {searchVal.length >= 3 && !apiLoading && filtered.length === 0 && (
                    <div style={{ textAlign: "center", padding: 16, color: C.g3, fontSize: "var(--shi-search-msg)" }}>
                      Nenhum resultado para &ldquo;{searchVal}&rdquo;
                    </div>
                  )}
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    {filtered.map((p) => {
                      const pi = p as PerfumeWithImage;
                      return (
                        <div
                          key={p.id}
                          onClick={() => selectPerfume(p)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 0",
                            borderBottom: `0.5px solid ${C.g5}`,
                            cursor: "pointer",
                          }}
                        >
                          {pi.image ? (
                            <img
                              src={pi.image}
                              alt={p.name}
                              style={{
                                width: 44,
                                height: 44,
                                objectFit: "contain",
                                flexShrink: 0,
                                background: C.white,
                                border: `1px solid ${C.g5}`,
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                background: C.alt,
                                border: `1px solid ${C.g5}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <span style={{ fontSize: 14, color: C.g1, fontWeight: 500 }}>{p.name[0]}</span>
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "var(--shi-search-name)", color: C.dark, fontWeight: 500 }}>{p.name}</div>
                            <div style={{ fontSize: "var(--shi-search-brand)", color: C.g2, fontWeight: 300 }}>{p.brand}</div>
                            {p.accords && p.accords.length > 0 && (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                                {p.accords.slice(0, 3).map((a, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      fontSize: "var(--shi-accord-fs)",
                                      color: C.g3,
                                      background: C.alt,
                                      padding: "var(--shi-accord-pad)",
                                      letterSpacing: 0.5,
                                    }}
                                  >
                                    {a.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {searchVal.length < 3 && (
                    <div style={{ textAlign: "center", fontSize: "var(--shi-search-hint)", color: C.g4, marginTop: 10 }}>
                      Digite para buscar
                    </div>
                  )}
                </div>
              )}

              {/* Notes section — centered, no emojis */}
              {filledCount > 0 && activeSlot < 0 && (
                <div
                  style={{
                    borderTop: `0.5px solid ${C.border}`,
                    paddingTop: 14,
                    marginBottom: 12,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "var(--shi-notes-label)",
                      letterSpacing: "var(--shi-label-ls)",
                      color: C.g2,
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}
                  >
                    Notas dos seus perfumes
                  </div>
                  {(["top", "mid", "base"] as const).map((tier) => {
                    const names: Record<string, string> = {
                      top: "TOPO",
                      mid: "CORAÇÃO",
                      base: "BASE",
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
                      <div key={tier} style={{ marginBottom: 8 }}>
                        <div
                          style={{
                            fontSize: "var(--shi-notes-label)",
                            color: C.g3,
                            letterSpacing: "var(--shi-label-ls)",
                            textTransform: "uppercase",
                            marginBottom: 5,
                            fontWeight: 500,
                          }}
                        >
                          {names[tier]}
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                          {allN.map((n, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: "var(--shi-notes-tag)",
                                color: C.g1,
                                background: C.alt,
                                border: `0.5px solid ${C.g5}`,
                                padding: "var(--shi-notes-tag-pad)",
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
                    Descobrir meu perfil olfativo
                  </button>
                  {filledCount < 3 && (
                    <div style={{ textAlign: "center", fontSize: "var(--shi-hint)", color: C.g3, marginTop: 6 }}>
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
                  <span style={{ fontFamily: serif, fontSize: "var(--shi-analyze-s)", color: C.dark }}>S</span>
                </div>
              </div>
              {["Analisando suas escolhas", "Identificando acordes", "Mapeando perfil olfativo", "Encontrando seu SHI"].map(
                (m, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "var(--shi-analyze-text)",
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
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <Logo size="sm" />
                </div>

                <div
                  style={{
                    textAlign: "center",
                    fontSize: "var(--shi-section-label)",
                    letterSpacing: "var(--shi-section-label-ls)",
                    color: C.g2,
                    textTransform: "uppercase",
                    marginBottom: 14,
                  }}
                >
                  Resultado do seu perfil olfativo
                </div>

                {/* Main result card with corners — border + no fill */}
                <div
                  style={{
                    border: `1px solid ${C.g4}`,
                    padding: "24px 16px",
                    textAlign: "center",
                    position: "relative",
                    marginBottom: 14,
                  }}
                >
                  <Corners />

                  <div
                    style={{
                      fontFamily: serif,
                      fontSize: "var(--shi-result-name)",
                      color: C.dark,
                      fontWeight: 400,
                      letterSpacing: 2,
                      marginBottom: 6,
                      lineHeight: 1.2,
                    }}
                  >
                    {results[0].base.name}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--shi-result-desc)",
                      color: C.g2,
                      letterSpacing: 1,
                      marginBottom: 16,
                      fontWeight: 300,
                      lineHeight: 1.5,
                    }}
                  >
                    {results[0].base.description}
                  </div>

                  <Divider />

                  <div style={{ marginTop: 16 }}>
                    <div
                      style={{
                        fontFamily: serif,
                        fontSize: "var(--shi-result-code)",
                        color: C.dark,
                        fontWeight: 400,
                        letterSpacing: 2,
                      }}
                    >
                      {formatBaseCode(results[0].base.code)}
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: "var(--shi-result-score)",
                        color: C.g2,
                        marginTop: 6,
                        padding: "3px 12px",
                        border: `1px solid ${C.g5}`,
                        letterSpacing: 0.5,
                      }}
                    >
                      {Math.round(results[0].score * 100)}% de afinidade
                    </div>
                  </div>

                  {/* Profile description inside card */}
                  {profileResult && (
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 14,
                        borderTop: `0.5px solid ${C.g5}`,
                      }}
                    >
                      <div style={{ fontSize: "var(--shi-result-profile)", color: C.g1, lineHeight: 1.7, fontWeight: 300 }}>
                        {profileResult.profile_description}
                      </div>
                    </div>
                  )}
                </div>

                {/* Alternatives — side by side */}
                {results.length > 1 && (
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ flex: 1, height: 0.5, background: C.g5 }} />
                      <div
                        style={{
                          fontSize: "var(--shi-section-label)",
                          letterSpacing: "var(--shi-section-label-ls)",
                          color: C.g3,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Também combinam com você
                      </div>
                      <div style={{ flex: 1, height: 0.5, background: C.g5 }} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {results.slice(1).map((r, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            textAlign: "center",
                            padding: "14px 8px",
                            border: `1px solid ${C.g5}`,
                          }}
                        >
                          <div
                            style={{
                              fontFamily: serif,
                              fontSize: "var(--shi-alt-code)",
                              fontWeight: 400,
                              color: C.dark,
                              letterSpacing: 1,
                              marginBottom: 4,
                            }}
                          >
                            {formatBaseCode(r.base.code)}
                          </div>
                          <div style={{ fontSize: "var(--shi-alt-name)", color: C.g1, fontWeight: 400, marginBottom: 4 }}>
                            {r.base.name}
                          </div>
                          <div style={{ fontSize: "var(--shi-alt-score)", color: C.g3 }}>{Math.round(r.score * 100)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected perfumes — "SUAS REFERÊNCIAS" with dots */}
                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ flex: 1, height: 0.5, background: C.g5 }} />
                    <div
                      style={{
                        fontSize: "var(--shi-section-label)",
                        letterSpacing: "var(--shi-section-label-ls)",
                        color: C.g3,
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Suas referências
                    </div>
                    <div style={{ flex: 1, height: 0.5, background: C.g5 }} />
                  </div>
                  <div style={{ textAlign: "center", fontSize: "var(--shi-ref-text)", color: C.g1, fontWeight: 300, lineHeight: 1.6 }}>
                    {slots
                      .filter(Boolean)
                      .map((p) => p!.name)
                      .join(" • ")}
                  </div>
                </div>

                {/* CTA Button */}
                <div style={{ marginTop: "auto" }}>
                  <button onClick={() => go("passport")} style={{ ...btnP, fontSize: "var(--shi-cta-fs)", letterSpacing: 1.5, padding: "14px 12px", lineHeight: 1.4 }}>
                    Clique aqui para ganhar o passaporte olfativo SHI Aroma Lab
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
                    border: `1px solid ${C.g4}`,
                    padding: "32px 18px 24px",
                    position: "relative",
                  }}
                >
                  <Corners />

                  <div
                    style={{
                      fontSize: "var(--shi-passport-label)",
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
                      fontSize: "var(--shi-passport-name)",
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
                      fontSize: "var(--shi-passport-base)",
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
                      fontSize: "var(--shi-result-desc)",
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
                        fontSize: "var(--shi-passport-label)",
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
                        fontSize: "var(--shi-passport-frag)",
                        color: C.dark,
                        fontWeight: 400,
                        letterSpacing: 2,
                      }}
                    >
                      {formatBaseCode(results[0].base.code)}
                    </div>
                  </div>

                  {/* Selected perfume names with dots */}
                  <div style={{ marginTop: 16, fontSize: "var(--shi-passport-ref)", color: C.g1, fontWeight: 300 }}>
                    {slots
                      .filter(Boolean)
                      .map((p) => p!.name)
                      .join(" • ")}
                  </div>

                  <div style={{ marginTop: 16, fontSize: "var(--shi-passport-event)", color: C.g4 }}>{event.name}</div>
                </div>

                {/* Buttons */}
                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                  <button
                    onClick={async () => {
                      const mainBase = results[0]?.base;
                      const text = [
                        `Meu Passaporte Olfativo — ${event.name}`,
                        `Código: ${passportCode}`,
                        "",
                        `Meu perfil: ${mainBase?.name}`,
                        `Fragrância: ${formatBaseCode(mainBase?.code || "")}`,
                        "",
                        `Perfumes escolhidos: ${slots.filter(Boolean).map((p) => p!.name).join(", ")}`,
                        "",
                        "Descubra o seu em shi.com.br",
                      ].join("\n");

                      if (navigator.share) {
                        try {
                          await navigator.share({ title: "Passaporte Olfativo SHI", text });
                        } catch {
                          /* user cancelled */
                        }
                      } else {
                        try {
                          await navigator.clipboard.writeText(text);
                          alert("Copiado! Cole onde quiser compartilhar.");
                        } catch {
                          /* fallback: do nothing */
                        }
                      }
                    }}
                    style={{ ...btnS, flex: 1, fontSize: "var(--shi-hint)", letterSpacing: 1.5 }}
                  >
                    Compartilhar
                  </button>
                  <button onClick={reset} style={{ ...btnS, flex: 1, fontSize: "var(--shi-hint)", letterSpacing: 1.5 }}>
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
