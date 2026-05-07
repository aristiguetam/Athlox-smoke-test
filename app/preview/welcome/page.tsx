"use client";

import { useState } from "react";

type Lang = "es" | "en";

const EMAILS = {
  es: {
    fromName: "ATHLOX",
    fromEmail: "team@athlox.co",
    toLabel: "para ti",
    date: "ahora",
    subjectPreview: "¡Ya estás dentro, amigo! 🔥",
    previewText: "Eres de los primeros en saber.",
    body: [
      "Gracias por unirte. Eres de los primeros en saber.",
      "Estamos trabajando en algo que no existe todavía — protección solar hecha para los que trabajan bajo el sol. Sin rutinas. Sin grasa. Sin dramas.",
      "Cuando esté listo, tú eres el primero en saberlo.",
      "— El equipo de ATHLOX",
    ],
    copy: {
      kicker: "PREVIEW / WELCOME EMAIL",
      title: "Email de bienvenida",
      desc: "Vista local. Para fidelidad real (dark mode, distintos clientes), manda un test desde Mailchimp.",
      copyHtml: "COPIAR HTML",
      copyText: "COPIAR TEXTO PLANO",
      copied: "¡COPIADO!",
      fnameNote:
        'El subject usa *|FNAME|* — Mailchimp lo reemplaza con el nombre del contacto, o con el default de la audience (recomendado: "amigo") cuando no hay nombre. Aquí lo ves resuelto.',
      back: "← VOLVER AL LANDING",
    },
  },
  en: {
    fromName: "ATHLOX",
    fromEmail: "team@athlox.co",
    toLabel: "to you",
    date: "now",
    subjectPreview: "You're in. We'll keep you posted. 🔥",
    previewText: "You're one of the first to know.",
    body: [
      "Thanks for signing up. You're one of the first to know.",
      "We're building something that doesn't exist yet — sun protection made for people who actually work outside. No routine. No grease. No drama.",
      "When it's ready, you hear about it first.",
      "— The ATHLOX Team",
    ],
    copy: {
      kicker: "PREVIEW / WELCOME EMAIL",
      title: "Welcome email",
      desc: "Local preview only. For real fidelity (dark mode, different clients), send a test from Mailchimp.",
      copyHtml: "COPY HTML",
      copyText: "COPY PLAIN TEXT",
      copied: "COPIED!",
      fnameNote:
        'The subject uses *|FNAME|* — Mailchimp swaps it for the contact\'s first name, or the audience default (recommended: "friend") when missing. Shown resolved here.',
      back: "← BACK TO LANDING",
    },
  },
} as const;

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildHtml(lang: Lang): string {
  const paragraphs = EMAILS[lang].body
    .map(
      (p) =>
        `  <p style="margin:0 0 16px;color:#1a1a1a;">${escapeHtml(p)}</p>`,
    )
    .join("\n");
  return [
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a;max-width:560px;">`,
    paragraphs,
    `</div>`,
  ].join("\n");
}

function buildText(lang: Lang): string {
  return EMAILS[lang].body.join("\n\n");
}

export default function PreviewWelcome() {
  const [lang, setLang] = useState<Lang>("es");
  const [copied, setCopied] = useState<"html" | "text" | null>(null);

  const e = EMAILS[lang];

  const onCopy = async (type: "html" | "text") => {
    const value = type === "html" ? buildHtml(lang) : buildText(lang);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      // clipboard not available — silently noop
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a1628] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-5 pb-24 pt-8 sm:px-10 sm:pt-12">
        {/* Top row */}
        <div className="mb-12 flex items-center justify-between gap-4">
          <a
            href="/"
            className="font-mono text-[11px] tracking-[0.28em] text-white/55 transition-colors hover:text-white"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            {e.copy.back}
          </a>
          <button
            type="button"
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] p-1 backdrop-blur-sm"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-medium tracking-[0.2em] transition-all ${
                lang === "es"
                  ? "bg-[#f97316] text-[#0a1628]"
                  : "text-white/55 hover:text-white"
              }`}
            >
              ES
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-medium tracking-[0.2em] transition-all ${
                lang === "en"
                  ? "bg-[#f97316] text-[#0a1628]"
                  : "text-white/55 hover:text-white"
              }`}
            >
              EN
            </span>
          </button>
        </div>

        {/* Title */}
        <div
          className="mb-5 flex items-center gap-3 font-mono text-[11px] tracking-[0.32em] text-[#f97316]"
          style={{ fontFamily: "var(--font-mono), monospace" }}
        >
          <span className="inline-block h-px w-10 bg-[#f97316]" />
          {e.copy.kicker}
        </div>
        <h1
          className="mb-4 text-3xl uppercase leading-[0.95] sm:text-5xl"
          style={{
            fontFamily: "var(--font-display), 'Arial Black', sans-serif",
          }}
        >
          {e.copy.title}
        </h1>
        <p className="mb-10 max-w-xl text-sm text-white/60 sm:text-base">
          {e.copy.desc}
        </p>

        {/* Copy actions */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onCopy("html")}
            className="border border-white/20 bg-white/[0.04] px-4 py-2 font-mono text-[11px] tracking-[0.22em] text-white/80 transition-colors hover:border-[#f97316] hover:text-[#f97316]"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            {copied === "html" ? e.copy.copied : e.copy.copyHtml}
          </button>
          <button
            type="button"
            onClick={() => onCopy("text")}
            className="border border-white/20 bg-white/[0.04] px-4 py-2 font-mono text-[11px] tracking-[0.22em] text-white/80 transition-colors hover:border-[#f97316] hover:text-[#f97316]"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            {copied === "text" ? e.copy.copied : e.copy.copyText}
          </button>
        </div>

        {/* Inbox mock */}
        <article className="overflow-hidden rounded-md bg-white text-zinc-900 shadow-2xl ring-1 ring-black/10">
          {/* Sender row */}
          <header className="flex items-start gap-4 border-b border-zinc-200 px-6 py-5">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#f97316] text-white"
              style={{
                fontFamily:
                  "var(--font-display), 'Arial Black', sans-serif",
                fontSize: "20px",
                lineHeight: 1,
              }}
              aria-hidden
            >
              A
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-semibold text-zinc-900 sm:text-base">
                  {e.fromName}
                </div>
                <div className="shrink-0 text-xs text-zinc-500">{e.date}</div>
              </div>
              <div className="truncate text-xs text-zinc-500 sm:text-sm">
                {e.fromEmail} · {e.toLabel}
              </div>
            </div>
          </header>

          {/* Subject + preview text */}
          <div className="px-6 pt-5">
            <h2
              className="text-xl font-semibold leading-snug text-zinc-900 sm:text-2xl"
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
              }}
            >
              {e.subjectPreview}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
              {e.previewText}
            </p>
          </div>

          {/* Body */}
          <div className="px-6 pb-8 pt-5">
            <div
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                fontSize: "16px",
                lineHeight: 1.6,
                color: "#1a1a1a",
              }}
            >
              {e.body.map((p, i) => (
                <p key={i} style={{ margin: "0 0 16px" }}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        </article>

        {/* Footer note */}
        <p
          className="mt-6 text-[11px] leading-relaxed tracking-[0.04em] text-white/45 sm:text-xs"
          style={{ fontFamily: "var(--font-mono), monospace" }}
        >
          {e.copy.fnameNote}
        </p>
      </div>
    </div>
  );
}
