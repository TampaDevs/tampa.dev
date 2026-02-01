/**
 * SignInPromptModal
 *
 * A beautifully designed modal that encourages unauthenticated users to sign in.
 * Triggered by favorite button clicks or after spending time on interactive pages.
 * Features a glass-card design with coral accents, engaging copy, and smooth animations.
 *
 * Follows the same modal patterns as BadgeDetailModal (Escape key, backdrop click,
 * fade-in + scale-in animations).
 */

import { useEffect } from "react";
import { Link, useLocation } from "react-router";

interface SignInPromptModalProps {
  onClose: () => void;
}

export function SignInPromptModal({ onClose }: SignInPromptModalProps) {
  const location = useLocation();
  const returnTo = encodeURIComponent(location.pathname + location.search);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: "signinFadeIn 0.25s ease-out" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden"
        style={{ animation: "signinScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        {/* Coral accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-coral via-coral-dark to-coral" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 pt-8">
          {/* Hero illustration — stylized community icon cluster */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              {/* Glow */}
              <div className="absolute inset-0 rounded-full blur-2xl opacity-25 bg-coral" style={{ width: 80, height: 80, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
              <div className="relative flex items-center gap-1">
                <span className="text-4xl" style={{ animation: "signinFloat 3s ease-in-out infinite" }}>
                  <HeartIcon />
                </span>
                <span className="text-5xl -mt-2" style={{ animation: "signinFloat 3s ease-in-out 0.3s infinite" }}>
                  <CodeBracketIcon />
                </span>
                <span className="text-4xl" style={{ animation: "signinFloat 3s ease-in-out 0.6s infinite" }}>
                  <PeopleIcon />
                </span>
              </div>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center leading-tight">
            Your Tampa Bay tech journey{" "}
            <span className="text-coral">starts here</span>
          </h2>

          {/* Body */}
          <p className="mt-3 text-center text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            Sign in to save your favorites across all your devices, RSVP to
            events, earn achievements, and connect with the community.
          </p>

          {/* Benefits list */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <BenefitItem
              icon={<SyncIcon />}
              text="Sync favorites everywhere"
            />
            <BenefitItem
              icon={<CalendarIcon />}
              text="RSVP to upcoming events"
            />
            <BenefitItem
              icon={<TrophyIcon />}
              text="Earn badges & achievements"
            />
            <BenefitItem
              icon={<CommunityIcon />}
              text="Join 2,000+ local devs"
            />
          </div>

          {/* CTA */}
          <Link
            to={`/login?returnTo=${returnTo}`}
            className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-coral hover:bg-coral-dark text-white rounded-xl font-semibold text-base transition-colors shadow-lg shadow-coral/20"
          >
            Sign In
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>

          {/* Dismiss */}
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors py-2"
          >
            Maybe later
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes signinFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes signinScaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes signinFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Benefit row                                                        */
/* ------------------------------------------------------------------ */

function BenefitItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5 border border-gray-100 dark:border-gray-700/50">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-coral/10 flex items-center justify-center text-coral">
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">
        {text}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero SVG icons (inline so no external deps)                        */
/* ------------------------------------------------------------------ */

function HeartIcon() {
  return (
    <svg className="w-9 h-9 text-coral" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function CodeBracketIcon() {
  return (
    <svg className="w-11 h-11 text-coral" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M14.447 3.026a.75.75 0 0 1 .527.921l-4.5 16.5a.75.75 0 0 1-1.448-.394l4.5-16.5a.75.75 0 0 1 .921-.527ZM16.72 6.22a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 1 1-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 0 1 0-1.06Zm-9.44 0a.75.75 0 0 1 0 1.06L2.56 12l4.72 4.72a.75.75 0 0 1-1.06 1.06L.97 12.53a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg className="w-9 h-9 text-coral" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498a.75.75 0 0 1-.372.568A12.696 12.696 0 0 1 12 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 0 1-.372-.568a6.787 6.787 0 0 1 1.019-4.38Z" />
      <path d="M5.082 14.254a8.287 8.287 0 0 0-1.308 5.135a9.687 9.687 0 0 1-1.764-.44l-.115-.04a.563.563 0 0 1-.373-.487l-.01-.121a3.75 3.75 0 0 1 3.57-4.047ZM20.226 19.389a8.287 8.287 0 0 0-1.308-5.135a3.75 3.75 0 0 1 3.57 4.047l-.01.121a.563.563 0 0 1-.373.486l-.115.04c-.567.2-1.156.349-1.764.441Z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Benefit list SVG icons                                             */
/* ------------------------------------------------------------------ */

function SyncIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.77.228m-2.77-.228a6.023 6.023 0 01-2.77-.228" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
