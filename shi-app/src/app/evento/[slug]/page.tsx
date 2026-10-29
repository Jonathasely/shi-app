"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { perfumes as localPerfumes } from "@/data/perfumes";
import { findBestBase, generatePassportCode } from "@/lib/algorithm";
import type { Perfume, Base, ProfileResult } from "@/lib/algorithm";

type Screen = "welcome" | "register" | "search" | "analyzing" | "result" | "passport";

interface Event {
  id: string;
  name: string;
  slug: string;
  status: string;
  client_logo_url: string | null;
  selected_bases: string[];
}

export default function EventoPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [screen, setScreen] = useState<Screen>("welcome");
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Auth
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  // Register — 4 fields
  const [guestName, setGuestName] = useState("");
  const [guestSurname, setGuestSurname] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPerfumes, setSelectedPerfumes] = useState<Perfume[]>([]);
  const [bases, setBases] = useState<Base[]>([]);

  // Result
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [passportCode, setPassportCode] = useState("");

  // Load event by slug
  useEffect(() => {
    async function loadEvent() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .single();

      if (error || !data) {
        setError("expired");
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
          data.map((b) => ({
            ...b,
            accords: typeof b.accords === "string" ? JSON.parse(b.accords) : b.accords,
          }))
        );
      }
    }

    loadEvent();
    loadBases();
  }, [slug]);

  // Verify event password
  const verifyPassword = useCallback(async () => {
    if (!event) return;
    const { data } = await supabase
      .from("events")
      .select("id")
      .eq("id", event.id)
      .eq("password", password)
      .single();

    if (data) {
      setAuthenticated(true);
      setScreen("register");
    } else {
      setError("wrong_password");
    }
  }, [event, password]);

  // Register guest — now requires name, surname, email, phone
  const register = useCallback(() => {
    if (!guestName.trim() || !guestSurname.trim() || !guestEmail.trim() || !guestPhone.trim()) return;
    setScreen("search");
  }, [guestName, guestSurname, guestEmail, guestPhone]);

  // Search perfumes
  const filteredPerfumes = localPerfumes.filter(
    (p) =>
      !selectedPerfumes.find((s) => s.id === p.id) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Select perfume — exactly 3
  const selectPerfume = (perfume: Perfume) => {
    if (selectedPerfumes.length >= 3) return;
    setSelectedPerfumes([...selectedPerfumes, perfume]);
    setSearchQuery("");
  };

  // Remove perfume
  const removePerfume = (id: string) => {
    setSelectedPerfumes(selectedPerfumes.filter((p) => p.id !== id));
  };

  // Run analysis — filters by event's 8 fragrances
  const analyze = useCallback(async () => {
    if (selectedPerfumes.length !== 3 || bases.length === 0) return;
    setScreen("analyzing");

    // Simulate analysis time for premium feel
    await new Promise((r) => setTimeout(r, 3000));

    const eventBaseIds = event?.selected_bases || [];
    const profileResult = findBestBase(selectedPerfumes, bases, eventBaseIds);
    const code = generatePassportCode();
    setResult(profileResult);
    setPassportCode(code);

    // Save to database
    if (event) {
      await supabase.from("participants").insert({
        event_id: event.id,
        name: guestName,
        surname: guestSurname,
        email: guestEmail || null,
        phone: guestPhone || null,
        selected_perfumes: selectedPerfumes.map((p) => ({
          name: p.name,
          brand: p.brand,
        })),
        accord_profile: profileResult.top_accords,
        result_base_id: profileResult.base.id,
        result_profile_name: profileResult.profile_name,
        result_profile_description: profileResult.profile_description,
        result_accords: profileResult.top_accords,
        passport_code: code,
      });
    }

    setScreen("result");
  }, [selectedPerfumes, bases, event, guestName, guestSurname, guestEmail, guestPhone]);

  // ====== RENDER ======

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <h1 className="font-serif text-4xl text-dark tracking-wider mb-1">SHI</h1>
          <p className="text-xs tracking-[3px] uppercase text-g3">Aroma Lab</p>
        </div>
      </main>
    );
  }

  if (error === "expired" || !event) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg p-6">
        <div className="text-center max-w-sm">
          <h1 className="font-serif text-4xl text-dark tracking-wider mb-1">SHI</h1>
          <p className="text-xs tracking-[3px] uppercase text-g3 mb-8">Aroma Lab</p>
          <p className="text-dark font-serif text-xl mb-3">Esta experiência foi encerrada</p>
          <p className="text-text text-sm">
            Obrigado por participar. Esperamos encontrar você novamente em uma próxima
            experiência SHI.
          </p>
        </div>
      </main>
    );
  }

  // WELCOME SCREEN
  if (screen === "welcome" && !authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg p-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-5xl text-dark tracking-wider mb-1">SHI</h1>
          <p className="text-xs tracking-[3px] uppercase text-g3 mb-2">Aroma Lab</p>
          <div className="w-8 h-px bg-g4 mx-auto mb-6" />
          <p className="text-dark font-serif text-lg mb-1">{event.name}</p>
          <p className="text-g2 text-sm mb-8">Descubra sua assinatura olfativa</p>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Senha do evento"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && verifyPassword()}
              className="w-full px-5 py-3.5 rounded-xl bg-bg-card border border-g5 text-dark text-center text-sm tracking-wider uppercase placeholder:text-g4 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-g3 transition"
            />
            {error === "wrong_password" && (
              <p className="text-error text-xs mt-2">Senha incorreta</p>
            )}
          </div>

          <button
            onClick={verifyPassword}
            className="w-full py-3.5 rounded-xl bg-dark text-bg-card text-sm tracking-wider uppercase font-medium transition hover:opacity-90"
          >
            Entrar na experiência
          </button>

          <p className="text-g3 text-xs mt-6">Singular · Hedônico · Inesquecível</p>
        </div>
      </main>
    );
  }

  // REGISTER SCREEN — 4 fields: nome, sobrenome, email, telefone
  if (screen === "register") {
    const canContinue = guestName.trim() && guestSurname.trim() && guestEmail.trim() && guestPhone.trim();
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg p-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-3xl text-dark tracking-wider mb-1">SHI</h1>
          <p className="text-xs tracking-[3px] uppercase text-g3 mb-8">Aroma Lab</p>

          <p className="text-dark font-serif text-xl mb-6">Vamos te conhecer</p>

          <div className="space-y-3 mb-6">
            <input
              type="text"
              placeholder="Nome *"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-5 py-3.5 rounded-xl bg-bg-card border border-g5 text-dark text-sm placeholder:text-g4 focus:outline-none focus:border-g3 transition"
            />
            <input
              type="text"
              placeholder="Sobrenome *"
              value={guestSurname}
              onChange={(e) => setGuestSurname(e.target.value)}
              className="w-full px-5 py-3.5 rounded-xl bg-bg-card border border-g5 text-dark text-sm placeholder:text-g4 focus:outline-none focus:border-g3 transition"
            />
            <input
              type="email"
              placeholder="E-mail *"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full px-5 py-3.5 rounded-xl bg-bg-card border border-g5 text-dark text-sm placeholder:text-g4 focus:outline-none focus:border-g3 transition"
            />
            <input
              type="tel"
              placeholder="Telefone *"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canContinue && register()}
              className="w-full px-5 py-3.5 rounded-xl bg-bg-card border border-g5 text-dark text-sm placeholder:text-g4 focus:outline-none focus:border-g3 transition"
            />
          </div>

          <button
            onClick={register}
            disabled={!canContinue}
            className="w-full py-3.5 rounded-xl bg-dark text-bg-card text-sm tracking-wider uppercase font-medium transition hover:opacity-90 disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      </main>
    );
  }

  // SEARCH SCREEN — exactly 3 perfumes
  if (screen === "search") {
    return (
      <main className="min-h-screen bg-bg p-6">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-serif text-2xl text-dark tracking-wider mb-1">SHI</h1>
            <p className="text-g2 text-sm">
              Olá, <span className="text-dark">{guestName}</span>
            </p>
          </div>

          {/* Selected perfumes */}
          {selectedPerfumes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedPerfumes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => removePerfume(p.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark text-bg-card text-xs"
                >
                  {p.name} <span className="opacity-60">✕</span>
                </button>
              ))}
            </div>
          )}

          {/* Counter — exactly 3 */}
          <p className="text-xs text-g2 mb-4">
            {selectedPerfumes.length}/3 perfumes selecionados
            {selectedPerfumes.length < 3 && (
              <span className="text-g3"> · selecione exatamente 3</span>
            )}
          </p>

          {/* Search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Qual perfume você ama?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-3.5 rounded-xl bg-bg-card border border-g5 text-dark text-sm placeholder:text-g3 focus:outline-none focus:border-g3 transition"
            />
          </div>

          {/* Results */}
          <div className="space-y-2 mb-6 max-h-[50vh] overflow-y-auto">
            {(searchQuery ? filteredPerfumes : localPerfumes.slice(0, 10)).map((p) => (
              <button
                key={p.id}
                onClick={() => selectPerfume(p)}
                disabled={selectedPerfumes.length >= 3}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-bg-card border border-g5 text-left transition hover:border-g3 disabled:opacity-40"
              >
                <div className="w-10 h-10 rounded-lg bg-bg flex items-center justify-center font-serif text-dark text-sm shrink-0">
                  {p.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-dark text-sm font-medium truncate">{p.name}</p>
                  <p className="text-g2 text-xs truncate">{p.brand}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Analyze button — only when exactly 3 */}
          {selectedPerfumes.length === 3 && (
            <button
              onClick={analyze}
              className="w-full py-3.5 rounded-xl bg-dark text-bg-card text-sm tracking-wider uppercase font-medium transition hover:opacity-90"
            >
              Descobrir minha fragrância
            </button>
          )}
        </div>
      </main>
    );
  }

  // ANALYZING SCREEN
  if (screen === "analyzing") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg p-6">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-full border-2 border-g5 border-t-dark mx-auto mb-8 animate-spin" />
          <p className="font-serif text-xl text-dark mb-2">
            Descobrindo sua assinatura olfativa…
          </p>
          <p className="text-g2 text-sm">
            Analisando seus perfumes favoritos
          </p>
        </div>
      </main>
    );
  }

  // RESULT SCREEN
  if (screen === "result" && result) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg p-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-xs tracking-[3px] uppercase text-g3 mb-6">Sua assinatura olfativa</p>

          <h2 className="font-serif text-3xl text-dark mb-1">{result.profile_name}</h2>
          <p className="text-g2 text-sm mb-6">
            {result.top_accords.slice(0, 4).map((a) => a.name).join(" · ")}
          </p>

          <div className="bg-bg-card rounded-2xl border border-g5 p-6 mb-6">
            <p className="text-xs tracking-[2px] uppercase text-g3 mb-3">Seu SHI</p>
            <p className="font-serif text-2xl text-dark mb-1">{result.base.code}</p>
            <p className="font-serif text-lg text-dark mb-3">{result.base.name}</p>
            <p className="text-text text-sm leading-relaxed">{result.base.description}</p>

            {/* Accord bars */}
            <div className="mt-5 space-y-2.5">
              {result.top_accords.slice(0, 5).map((accord) => (
                <div key={accord.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-g2">{accord.name}</span>
                    <span className="text-g3">{accord.value}%</span>
                  </div>
                  <div className="h-1.5 bg-g5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-dark rounded-full transition-all duration-1000"
                      style={{ width: `${accord.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-text text-sm leading-relaxed mb-6">
            {result.profile_description}
          </p>

          <div className="flex items-center justify-center gap-2 text-xs text-g3 mb-6">
            <span className="tracking-wider">Compatibilidade</span>
            <span className="text-dark font-medium text-sm">{result.score}%</span>
          </div>

          <button
            onClick={() => setScreen("passport")}
            className="w-full py-3.5 rounded-xl bg-dark text-bg-card text-sm tracking-wider uppercase font-medium transition hover:opacity-90"
          >
            Ver meu passaporte olfativo
          </button>
        </div>
      </main>
    );
  }

  // PASSPORT SCREEN
  if (screen === "passport" && result) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg p-6">
        <div className="w-full max-w-sm">
          <div className="bg-bg-card rounded-2xl border border-g5 overflow-hidden">
            {/* Header */}
            <div className="bg-dark text-center py-8 px-6">
              <h1 className="font-serif text-3xl text-[#F9F7F6] tracking-wider mb-1">SHI</h1>
              <p className="text-xs tracking-[3px] uppercase text-g3">Passaporte Olfativo</p>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-xs text-g3 uppercase tracking-wider mb-1">Convidada</p>
                <p className="font-serif text-xl text-dark">
                  {guestName} {guestSurname}
                </p>
              </div>

              <div className="w-full h-px bg-g5 mb-6" />

              <div className="text-center mb-6">
                <p className="text-xs text-g3 uppercase tracking-wider mb-1">Perfil Olfativo</p>
                <p className="font-serif text-lg text-dark">{result.profile_name}</p>
                <p className="text-g2 text-xs mt-1">
                  {result.top_accords.slice(0, 4).map((a) => a.name).join(" · ")}
                </p>
              </div>

              <div className="text-center mb-6">
                <p className="text-xs text-g3 uppercase tracking-wider mb-1">Sua fragrância</p>
                <p className="font-serif text-2xl text-dark">{result.base.code}</p>
                <p className="text-dark text-sm">{result.base.name}</p>
              </div>

              <div className="w-full h-px bg-g5 mb-6" />

              <div className="text-center mb-4">
                <p className="text-xs text-g3 uppercase tracking-wider mb-1">Perfumes escolhidos</p>
                <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                  {selectedPerfumes.map((p) => (
                    <span
                      key={p.id}
                      className="px-2.5 py-1 rounded-full bg-bg text-xs text-g2 border border-g5"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-center mt-6">
                <p className="text-xs text-g3 uppercase tracking-wider mb-1">Código</p>
                <p className="font-mono text-lg text-dark tracking-widest">{passportCode}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-g5 py-4 text-center">
              <p className="text-[10px] tracking-[2px] uppercase text-g3">
                Singular · Hedônico · Inesquecível
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-g3 mt-4">
            {event.name}
          </p>
        </div>
      </main>
    );
  }

  return null;
}
