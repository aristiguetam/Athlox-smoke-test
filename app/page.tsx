"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type Lang = "es" | "en";

// Detect browser language without setState-in-effect cascading renders.
// useSyncExternalStore handles SSR/hydration: server returns "es", client
// reads navigator.language on first render after hydration.
const subscribeNoop = () => () => {};
const getDetectedLang = (): Lang => {
  if (typeof navigator === "undefined") return "es";
  return (navigator.language || "").toLowerCase().startsWith("en") ? "en" : "es";
};
const getServerLang = (): Lang => "es";

const T = {
  es: {
    htmlLang: "es",
    aria: {
      toggle: "Cambiar idioma",
      es: "Español",
      en: "Inglés",
    },
    meta: "MIAMI · 2026",
    spec: "[ SPF · 50+ ]",
    hero: {
      eyebrow: "PROTECCIÓN SOLAR / OBRA",
      headline: ["DAÑO DEL SOL.", "DETENLO EN", "30 SEGUNDOS."],
      sub: "Para hombres que trabajan al sol todos los días — no para la playa. Sin pasos. Sin vueltas.",
    },
    benefits: [
      {
        num: "01",
        label: "QUE NO SE SIENTA",
        body: "Liviano. Cero grasa. Como si no tuvieras nada en la cara.",
      },
      {
        num: "02",
        label: "NO MANCHA LA ROPA",
        body: "Sin marcas blancas. Tu camisa de trabajo queda intacta.",
      },
      {
        num: "03",
        label: "SOLO TOMA 30 SEGUNDOS",
        body: "Te lo aplicas y arrancas. Cabe en el bolsillo del pantalón.",
      },
    ],
    form: {
      kicker: "ACCESO ANTICIPADO",
      label: "Tu correo electrónico",
      placeholder: "tu@correo.com",
      firstNameLabel: "Tu nombre",
      firstNamePlaceholder: "¿Cómo te llamas?",
      phoneLabel: "Tu teléfono (opcional)",
      phonePlaceholder: "+1 (305) 000-0000",
      cta: "AVÍSAME",
      ctaLoading: "ENVIANDO…",
      thanks: "¡Listo! Te avisamos cuando esté disponible.",
      thanksAlready: "¡Ya estás en la lista! Gracias — te avisamos cuando esté disponible.",
      thanksKicker: "RECIBIDO",
      errFirstName: "Por favor ingresa tu nombre.",
      errGeneric: "Algo salió mal. Intenta de nuevo.",
    },
    footer: "Sé el primero en saber",
    legal: "PROTECCIÓN DIARIA / TRABAJO AL AIRE LIBRE",
  },
  en: {
    htmlLang: "en",
    aria: {
      toggle: "Switch language",
      es: "Spanish",
      en: "English",
    },
    meta: "MIAMI · 2026",
    spec: "[ SPF · 50+ ]",
    hero: {
      eyebrow: "SUN PROTECTION / JOB SITE",
      headline: ["BUILT FOR THE", "JOB SITE,", "NOT THE BEACH."],
      sub: "Sun protection for men who work outside. Takes 30 seconds. No steps. Pocket-sized.",
    },
    benefits: [
      {
        num: "01",
        label: "WON'T MAKE YOUR TOOLS SLIP",
        body: "Dry-touch finish. No grease. Your grip stays where it should.",
      },
      {
        num: "02",
        label: "WON'T STAIN YOUR CLOTHES",
        body: "No white residue. Your work shirt comes home the way it left.",
      },
      {
        num: "03",
        label: "TAKES 30 SECONDS",
        body: "One pass. Pocket-sized stick. Apply and get back to work.",
      },
    ],
    form: {
      kicker: "EARLY ACCESS",
      label: "Your email address",
      placeholder: "you@email.com",
      firstNameLabel: "Your first name",
      firstNamePlaceholder: "What's your name?",
      phoneLabel: "Your phone (optional)",
      phonePlaceholder: "+1 (305) 000-0000",
      cta: "NOTIFY ME",
      ctaLoading: "SENDING…",
      thanks: "You're in! We'll let you know when it's ready.",
      thanksAlready: "You're already on the list! Thanks — we'll let you know when it's ready.",
      thanksKicker: "RECEIVED",
      errFirstName: "Please enter your first name.",
      errGeneric: "Something went wrong. Please try again.",
    },
    footer: "Be the first to know",
    legal: "DAILY PROTECTION / OUTDOOR WORK",
  },
} as const;

type FormError = "generic" | null;
type Submitted = "new" | "already" | null;

export default function Page() {
  const detectedLang = useSyncExternalStore(
    subscribeNoop,
    getDetectedLang,
    getServerLang,
  );
  const [userLang, setUserLang] = useState<Lang | null>(null);
  const lang: Lang = userLang ?? detectedLang;
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [firstNameError, setFirstNameError] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FormError>(null);
  const [honeypot, setHoneypot] = useState("");
  const loadedAtRef = useRef<number | null>(null);

  useEffect(() => {
    loadedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    document.documentElement.lang = T[lang].htmlLang;
  }, [lang]);

  const c = T[lang];

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);

    if (!firstName.trim()) {
      setFirstNameError(true);
      setLoading(false);
      return;
    }
    setFirstNameError(false);

    const getCookie = (name: string): string | null => {
      for (const part of document.cookie.split(";")) {
        const [k, ...rest] = part.trim().split("=");
        if (k === name) return rest.join("=") || null;
      }
      return null;
    };
    const fbp = getCookie("_fbp");
    let fbc = getCookie("_fbc");
    if (!fbc) {
      const fbclid = new URLSearchParams(window.location.search).get("fbclid");
      if (fbclid) {
        fbc = `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`;
      }
    }

    const eventId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          language: lang,
          firstName: firstName.trim(),
          phone: phone.trim(),
          company: honeypot,
          loadedAt: loadedAtRef.current,
          eventId,
          fbp,
          fbc,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (data.success) {
        setSubmitted("new");
        if (typeof window !== "undefined" && typeof window.fbq === "function") {
          window.fbq("track", "Lead", {}, { eventID: eventId });
        }
      } else if (data.error === "already subscribed") {
        setSubmitted("already");
      } else {
        setError("generic");
      }
    } catch {
      setError("generic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a1628] text-white selection:bg-[#f97316] selection:text-[#0a1628]">
      {/* Atmosphere: blueprint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      {/* Atmosphere: orange diagonal stripe */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/4 h-[120%] w-[2px] origin-top rotate-12 bg-[#f97316] opacity-30"
      />
      {/* Atmosphere: corner crosshair */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-6 bottom-6 h-10 w-10 opacity-30 sm:right-10 sm:bottom-10"
      >
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#f97316]" />
        <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-[#f97316]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-10 sm:pt-7">
        <div
          className="font-mono text-[10px] tracking-[0.28em] text-white/55 sm:text-xs"
          style={{ fontFamily: "var(--font-mono), monospace" }}
        >
          {c.spec} <span className="mx-2 text-white/20">/</span> {c.meta}
        </div>

        <button
          type="button"
          onClick={() => setUserLang(lang === "es" ? "en" : "es")}
          aria-label={c.aria.toggle}
          className="group flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] p-1 backdrop-blur-sm transition-colors hover:border-white/30"
          style={{ fontFamily: "var(--font-mono), monospace" }}
        >
          <span
            aria-pressed={lang === "es"}
            className={`rounded-full px-3 py-1 text-[11px] font-medium tracking-[0.2em] transition-all duration-200 sm:text-xs ${
              lang === "es"
                ? "bg-[#f97316] text-[#0a1628]"
                : "text-white/55 hover:text-white"
            }`}
          >
            ES
          </span>
          <span
            aria-pressed={lang === "en"}
            className={`rounded-full px-3 py-1 text-[11px] font-medium tracking-[0.2em] transition-all duration-200 sm:text-xs ${
              lang === "en"
                ? "bg-[#f97316] text-[#0a1628]"
                : "text-white/55 hover:text-white"
            }`}
          >
            EN
          </span>
        </button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-14 pb-20 sm:px-10 sm:pt-24">
        {/* Hero */}
        <section>
          <div
            className="mb-6 flex items-center gap-3 font-mono text-[11px] tracking-[0.32em] text-[#f97316] sm:text-xs"
            style={{ fontFamily: "var(--font-mono), monospace" }}
          >
            <span className="inline-block h-px w-10 bg-[#f97316]" />
            {c.hero.eyebrow}
          </div>

          <h1
            className="text-[44px] leading-[0.92] tracking-tight uppercase sm:text-7xl md:text-[112px]"
            style={{ fontFamily: "var(--font-display), 'Arial Black', sans-serif" }}
          >
            {c.hero.headline.map((line, i) => (
              <span key={i} className="block">
                {i === c.hero.headline.length - 1 ? (
                  <>
                    <span className="relative">
                      {line}
                      <span className="ml-2 inline-block h-3 w-3 translate-y-[-0.6em] bg-[#f97316] sm:h-4 sm:w-4 md:h-6 md:w-6" />
                    </span>
                  </>
                ) : (
                  line
                )}
              </span>
            ))}
          </h1>

          <p className="mt-8 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            {c.hero.sub}
          </p>
        </section>

        {/* Benefits — 3-up industrial cards */}
        <section
          aria-label={lang === "es" ? "Beneficios" : "Benefits"}
          className="mt-20 grid grid-cols-1 gap-px overflow-hidden border border-white/10 bg-white/10 sm:mt-28 sm:grid-cols-3"
        >
          {c.benefits.map((b) => (
            <article
              key={b.num}
              className="group flex flex-col gap-4 bg-[#0a1628] p-6 transition-colors duration-300 hover:bg-[#0d1a30] sm:p-8"
            >
              <div
                className="flex items-baseline gap-3 font-mono text-[11px] tracking-[0.28em] text-[#f97316]"
                style={{ fontFamily: "var(--font-mono), monospace" }}
              >
                <span>{b.num}</span>
                <span className="h-px flex-1 bg-[#f97316]/30 transition-colors group-hover:bg-[#f97316]" />
              </div>
              <h3
                className="text-xl leading-tight uppercase sm:text-2xl"
                style={{
                  fontFamily: "var(--font-display), 'Arial Black', sans-serif",
                }}
              >
                {b.label}
              </h3>
              <p className="text-sm leading-relaxed text-white/60 sm:text-base">
                {b.body}
              </p>
            </article>
          ))}
        </section>

        {/* Form */}
        <section className="mt-24 sm:mt-32">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-3 w-3 bg-[#f97316]" />
            <span
              className="font-mono text-[11px] tracking-[0.32em] text-[#f97316] sm:text-xs"
              style={{ fontFamily: "var(--font-mono), monospace" }}
            >
              {submitted ? c.form.thanksKicker : c.form.kicker}
            </span>
          </div>

          <h2
            className="text-3xl leading-none uppercase sm:text-5xl md:text-6xl"
            style={{ fontFamily: "var(--font-display), 'Arial Black', sans-serif" }}
          >
            {c.footer}.
          </h2>

          <div className="mt-10 max-w-2xl">
            {!submitted ? (
              <>
                <form
                  onSubmit={onSubmit}
                  className="flex flex-col gap-3"
                  noValidate={false}
                  aria-busy={loading}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-[-9999px] top-[-9999px] h-px w-px overflow-hidden opacity-0"
                  >
                    <label htmlFor="company-website">Company website</label>
                    <input
                      id="company-website"
                      type="text"
                      name="company"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>
                  <label htmlFor="firstName" className="sr-only">
                    {c.form.firstNameLabel}
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    autoComplete="given-name"
                    disabled={loading}
                    placeholder={c.form.firstNamePlaceholder}
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (firstNameError) setFirstNameError(false);
                    }}
                    aria-invalid={firstNameError || undefined}
                    aria-describedby={
                      firstNameError ? "firstName-error" : undefined
                    }
                    className={`border-2 ${
                      firstNameError ? "border-[#f97316]/60" : "border-white/20"
                    } bg-transparent px-4 py-4 text-lg text-white placeholder-white/30 outline-none transition-colors focus:border-[#f97316] disabled:opacity-50 sm:text-xl`}
                  />
                  {firstNameError && (
                    <div
                      id="firstName-error"
                      role="alert"
                      aria-live="polite"
                      className="flex items-center gap-3 border border-[#f97316]/40 bg-[#f97316]/[0.06] px-4 py-3 text-sm text-[#f97316] sm:text-base"
                    >
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 shrink-0 bg-[#f97316]"
                      />
                      <span>{c.form.errFirstName}</span>
                    </div>
                  )}
                  <label htmlFor="email" className="sr-only">
                    {c.form.label}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    disabled={loading}
                    placeholder={c.form.placeholder}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    className="border-2 border-white/20 bg-transparent px-4 py-4 text-lg text-white placeholder-white/30 outline-none transition-colors focus:border-[#f97316] disabled:opacity-50 sm:text-xl"
                  />
                  <label htmlFor="phone" className="sr-only">
                    {c.form.phoneLabel}
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    disabled={loading}
                    placeholder={c.form.phonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="border-2 border-white/20 bg-transparent px-4 py-4 text-lg text-white placeholder-white/30 outline-none transition-colors focus:border-[#f97316] disabled:opacity-50 sm:text-xl"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex items-center justify-center gap-3 bg-[#f97316] px-8 py-4 text-base uppercase tracking-wider text-[#0a1628] transition-all duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-[#f97316] sm:text-lg"
                    style={{
                      fontFamily: "var(--font-display), 'Arial Black', sans-serif",
                    }}
                  >
                    {loading ? (
                      <>
                        {c.form.ctaLoading}
                        <span
                          aria-hidden
                          className="inline-block h-3 w-3 animate-spin border-2 border-[#0a1628] border-t-transparent"
                        />
                      </>
                    ) : (
                      <>
                        {c.form.cta}
                        <span
                          aria-hidden
                          className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                        >
                          →
                        </span>
                      </>
                    )}
                  </button>
                </form>

                {error && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="mt-4 flex items-center gap-3 border border-[#f97316]/40 bg-[#f97316]/[0.06] px-4 py-3 text-sm text-[#f97316] sm:text-base"
                  >
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 shrink-0 bg-[#f97316]"
                    />
                    <span>{c.form.errGeneric}</span>
                  </div>
                )}
              </>
            ) : (
              <div
                role="status"
                aria-live="polite"
                className="border-2 border-[#f97316] bg-[#f97316]/5 p-6 sm:p-8"
              >
                <div
                  className="text-2xl uppercase leading-tight text-[#f97316] sm:text-3xl"
                  style={{
                    fontFamily: "var(--font-display), 'Arial Black', sans-serif",
                  }}
                >
                  {submitted === "already" ? c.form.thanksAlready : c.form.thanks}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 flex items-center justify-between border-t border-white/10 px-5 pt-6 pb-6 font-mono text-[10px] tracking-[0.3em] text-white/40 sm:px-10"
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        <span>{c.legal}</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}
