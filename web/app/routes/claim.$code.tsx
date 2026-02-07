/**
 * Badge Claim Page
 *
 * Dramatic spotlight-style claim page with oval badge shape,
 * floating animation, particle effects, and a fun CTA button.
 */

import { Link, data } from "react-router";
import { useState, useRef, useCallback } from "react";
import type { Route } from "./+types/claim.$code";
import { generateMetaTags } from "~/lib/seo";
import { getTrophyTier, TrophyIcon } from "~/lib/trophy-tiers";
import { Emoji } from "~/components/Emoji";
import { fetchCurrentUser } from "~/lib/admin-api.server";

interface BadgeInfo {
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string | null;
  points?: number;
}

interface ClaimInfo {
  badge: BadgeInfo;
  claimable: boolean;
  reason?: string;
}

export const meta: Route.MetaFunction = () => {
  return generateMetaTags({
    title: "Claim Badge",
    description: "Claim your badge on Tampa.dev",
    url: "/claim",
  });
};

export async function loader({ params, request }: Route.LoaderArgs) {
  const apiUrl = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
  const cookieHeader = request.headers.get("Cookie") || "";

  // Fetch badge info for this claim code
  const claimResponse = await fetch(
    `${apiUrl}/claim/${encodeURIComponent(params.code!)}`,
    {
      headers: { Accept: "application/json" },
    }
  );

  if (!claimResponse.ok) {
    throw data(null, { status: 404 });
  }

  const claimInfo = ((await claimResponse.json()) as { data: ClaimInfo }).data;

  // Check if user is logged in (uses /auth/me endpoint)
  const user = await fetchCurrentUser(cookieHeader);
  const isLoggedIn = !!user;
  const currentUsername = user?.username || null;

  return {
    claimInfo,
    code: params.code!,
    isLoggedIn,
    currentUsername,
  };
}

type ClaimStatus = "idle" | "loading" | "success" | "error";

/** Try to play the achievement sound (may be blocked by browser) */
function playClaimSound() {
  try {
    new Audio("/sounds/achievement.mp3").play();
  } catch {
    /* user may not have interacted yet */
  }
}

export default function ClaimBadgePage({
  loaderData,
}: Route.ComponentProps) {
  const { claimInfo, code, isLoggedIn, currentUsername } = loaderData;
  const { badge } = claimInfo;
  const trophyTier = badge.points ? getTrophyTier(badge.points) : null;

  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successBurst, setSuccessBurst] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rx = ((y - rect.height / 2) / (rect.height / 2)) * -12;
      const ry = ((x - rect.width / 2) / (rect.width / 2)) * 12;
      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
    },
    []
  );

  const onMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (el) {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    }
  }, []);

  async function handleClaim() {
    setStatus("loading");
    setErrorMessage("");

    try {
      const apiUrl =
        import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";
      const response = await fetch(
        `${apiUrl}/claim/${encodeURIComponent(code)}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setStatus("success");
        setSuccessBurst(true);
        playClaimSound();
      } else {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMessage(
          errorData.error || "Failed to claim badge. It may be expired, already claimed, or the maximum uses have been reached."
        );
        setStatus("error");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  }

  // Generate particle positions once
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 8,
      duration: Math.random() * 6 + 6,
      opacity: Math.random() * 0.4 + 0.1,
    }))
  );

  // Generate confetti particles for success
  const [confettiParticles] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: Math.random() * 1.5 + 1.5,
      color: ["#F97066", "#22C55E", "#3B82F6", "#F59E0B", "#A855F7", "#EC4899", "#14B8A6", "#F43F5E"][i % 8],
      rotation: Math.random() * 360,
      size: Math.random() * 6 + 3,
    }))
  );

  return (
    <div className={`min-h-screen flex flex-col items-center justify-start px-4 pt-16 pb-24 relative overflow-hidden transition-colors duration-700 ${status === "success"
      ? "bg-gray-900"
      : "bg-gray-950"
      }`}>
      <style>{`
        /* Floating animation — continues on hover (mouse tilt overlays on top) */
        @keyframes claim-float {
          0% {
            transform: translateY(0) translateX(0) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) rotate(0deg) scale(1);
          }
          25% {
            transform: translateY(-12px) translateX(4px) rotateX(var(--rx, 2deg)) rotateY(var(--ry, -1deg)) rotate(0.5deg) scale(1.005);
          }
          50% {
            transform: translateY(-6px) translateX(-3px) rotateX(var(--rx, -1deg)) rotateY(var(--ry, 2deg)) rotate(-0.5deg) scale(0.998);
          }
          75% {
            transform: translateY(-14px) translateX(2px) rotateX(var(--rx, 1deg)) rotateY(var(--ry, -2deg)) rotate(0.3deg) scale(1.002);
          }
          100% {
            transform: translateY(0) translateX(0) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) rotate(0deg) scale(1);
          }
        }

        /* Spotlight pulse behind badge */
        @keyframes spotlight-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }

        /* Badge glow pulse */
        @keyframes badge-glow {
          0%, 100% { box-shadow: 0 0 30px var(--badge-glow), 0 0 60px var(--badge-glow); }
          50% { box-shadow: 0 0 50px var(--badge-glow), 0 0 100px var(--badge-glow), 0 0 140px var(--badge-glow-faint); }
        }

        /* Particle drift */
        @keyframes particle-drift {
          0% { transform: translateY(0) translateX(0); opacity: var(--p-opacity); }
          50% { transform: translateY(-20px) translateX(10px); opacity: calc(var(--p-opacity) * 1.5); }
          100% { transform: translateY(0) translateX(0); opacity: var(--p-opacity); }
        }

        /* CTA shimmer sweep */
        @keyframes cta-shimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(250%); }
        }

        /* Success confetti */
        @keyframes confetti-burst {
          0% { transform: translateY(0) rotate(var(--c-rot)) scale(1); opacity: 1; }
          100% { transform: translateY(calc(-150px - 50px * var(--c-rand))) rotate(calc(var(--c-rot) + 720deg)) scale(0.3); opacity: 0; }
        }

        /* Success badge scale-up */
        @keyframes success-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }

        .claim-badge-float {
          animation: claim-float 5s ease-in-out infinite;
        }

        .claim-badge-glow {
          animation: badge-glow 3s ease-in-out infinite;
        }

        .claim-spotlight {
          animation: spotlight-pulse 4s ease-in-out infinite;
        }

        .claim-particle {
          animation: particle-drift var(--p-duration) ease-in-out infinite;
          animation-delay: var(--p-delay);
        }

        .claim-cta-shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: cta-shimmer 3s ease-in-out infinite;
        }

        .claim-success-pop {
          animation: success-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .claim-confetti {
          animation: confetti-burst var(--c-duration) ease-out forwards;
          animation-delay: var(--c-delay);
        }
      `}</style>

      {/* Particle star field */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-white claim-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              "--p-opacity": p.opacity,
              "--p-delay": `${p.delay}s`,
              "--p-duration": `${p.duration}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Radial spotlight behind badge */}
      <div
        className="absolute pointer-events-none claim-spotlight"
        style={{
          width: "500px",
          height: "500px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -60%)",
          background: `radial-gradient(circle, ${badge.color}18 0%, ${badge.color}08 40%, transparent 70%)`,
        }}
      />

      {/* Success confetti burst */}
      {successBurst && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {confettiParticles.map((cp) => (
            <div
              key={cp.id}
              className="absolute claim-confetti rounded-sm"
              style={{
                left: `${cp.x}%`,
                top: "45%",
                width: cp.size,
                height: cp.size,
                backgroundColor: cp.color,
                "--c-rot": `${cp.rotation}deg`,
                "--c-delay": `${cp.delay}s`,
                "--c-duration": `${cp.duration}s`,
                "--c-rand": Math.random(),
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Badge Display — Oval/shield shape */}
      <div
        ref={containerRef}
        style={{ perspective: "900px" }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="mb-10 relative"
      >
        <div
          ref={cardRef}
          className={`w-56 h-72 flex flex-col items-center justify-center p-6 relative overflow-hidden claim-badge-float ${status === "success" ? "claim-success-pop" : ""
            }`}
          style={{
            "--badge-glow": `${badge.color}40`,
            "--badge-glow-faint": `${badge.color}15`,
            transformStyle: "preserve-3d",
            transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
            transition: "transform 0.12s ease-out",
            borderRadius: "50% / 45%",
            background: `linear-gradient(160deg, ${badge.color}15, ${badge.color}30, ${badge.color}10)`,
            border: `2px solid ${badge.color}50`,
          } as React.CSSProperties}
        >
          {/* Inner glow */}
          <div
            className="absolute inset-0 pointer-events-none claim-badge-glow"
            style={{
              "--badge-glow": `${badge.color}25`,
              "--badge-glow-faint": `${badge.color}10`,
              borderRadius: "50% / 45%",
            } as React.CSSProperties}
          />

          {/* Radial accent */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: "50% / 45%",
              background: `radial-gradient(circle at 35% 25%, ${badge.color}22 0%, transparent 55%)`,
            }}
          />

          {/* Badge Icon */}
          <div className="relative z-10 mb-3 drop-shadow-lg">
            <Emoji emoji={badge.icon} size={72} />
          </div>

          {/* Badge Name */}
          <h2 className="relative z-10 text-xl font-bold text-white text-center leading-tight">
            {badge.name}
          </h2>

          {/* Badge Description */}
          {badge.description && (
            <p className="relative z-10 text-sm text-gray-400 text-center mt-2 leading-relaxed px-2">
              {badge.description}
            </p>
          )}

          {/* XP + Trophy tier */}
          {badge.points != null && badge.points > 0 && trophyTier && (
            <div className="relative z-10 flex items-center gap-1.5 mt-3">
              <TrophyIcon tier={trophyTier.tier} size={16} />
              <span className="text-sm font-semibold" style={{ color: trophyTier.color }}>
                {badge.points} XP
              </span>
            </div>
          )}

          {/* Shine highlight */}
          <div
            className="absolute top-4 left-1/4 w-16 h-3 rounded-full pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
              borderRadius: "50% / 45%",
            }}
          />
        </div>
      </div>

      {/* Action Area */}
      <div className="text-center max-w-md relative z-10">
        {status === "success" ? (
          <div className="relative">
            <div className="bg-green-900/30 border border-green-700/50 rounded-2xl p-8 backdrop-blur-sm">
              <div className="text-5xl mb-4">&#127881;</div>
              <h3 className="text-xl font-bold text-green-300 mb-2">
                Badge Claimed!
              </h3>
              <p className="text-green-400/80 text-sm mb-6">
                <strong className="text-green-300">{badge.name}</strong> has been added to your profile.
              </p>
              <Link
                to={currentUsername ? `/p/${currentUsername}` : "/profile"}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors"
              >
                View Your Profile
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        ) : status === "error" ? (
          <div className="bg-red-900/30 border border-red-700/50 rounded-2xl p-8 backdrop-blur-sm">
            <div className="text-4xl mb-3">&#9888;&#65039;</div>
            <h3 className="text-lg font-bold text-red-300 mb-2">
              Could Not Claim Badge
            </h3>
            <p className="text-red-400/80 text-sm mb-4">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        ) : !isLoggedIn ? (
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Claim This Badge
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              You'll need to sign in to add this badge to your profile.
            </p>
            <Link
              to={`/login?returnTo=${encodeURIComponent(`/claim/${code}`)}`}
              className="claim-cta-shimmer relative overflow-hidden inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-white text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20"
              style={{
                background: "linear-gradient(135deg, #F97066 0%, #E85A4F 50%, #F07167 100%)",
              }}
            >
              {/* Sparkle icon */}
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" />
              </svg>
              Sign In & Claim
            </Link>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Claim This Badge
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Add <strong className="text-white">{badge.name}</strong> to your profile.
            </p>
            <button
              type="button"
              onClick={handleClaim}
              disabled={status === "loading"}
              className="claim-cta-shimmer relative overflow-hidden inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-white text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: "linear-gradient(135deg, #F97066 0%, #E85A4F 50%, #F07167 100%)",
              }}
            >
              {status === "loading" ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Claiming...
                </>
              ) : (
                <>
                  {/* Sparkle icon */}
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" />
                  </svg>
                  Claim This Badge
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
