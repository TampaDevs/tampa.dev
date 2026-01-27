import { useState, type FormEvent } from "react";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export function NewsletterSignup() {
  const [status, setStatus] = useState<SubmitStatus>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("https://newsletter.api.tampa.dev/subscribe", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setStatus("success");
        form.reset();
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        throw new Error("Subscription failed");
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const buttonText = {
    idle: "Subscribe",
    submitting: "Subscribing...",
    success: "Subscribed ✔️",
    error: "Something Broke 😔",
  }[status];

  const buttonClasses = {
    idle: "bg-white text-gray-800 hover:bg-gray-50 shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5",
    submitting: "bg-gray-200 text-gray-600 cursor-wait shadow-md",
    success: "bg-green-100 text-green-800 shadow-lg shadow-green-500/20",
    error: "bg-gray-700 text-white shadow-lg",
  }[status];

  return (
    <section id="newsletter" className="bg-coral scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Keep in touch
          </h2>
          <p className="mt-3 text-white/90 text-lg">
            Stay informed with local tech news, upcoming events, job opportunities,
            and more from Tampa Devs.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8"
          id="newsletter-form"
          name="newsletter-form"
        >
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              name="firstname"
              placeholder="First name"
              autoComplete="off"
              className="flex-1 px-4 py-3 rounded-lg backdrop-blur-sm bg-white/15 border border-white/25 text-white placeholder:text-white/50 focus:outline-none focus:border-white/60 focus:bg-white/20 transition-all shadow-inner shadow-black/5"
            />
            <input
              type="text"
              name="lastname"
              placeholder="Last name"
              autoComplete="off"
              className="flex-1 px-4 py-3 rounded-lg backdrop-blur-sm bg-white/15 border border-white/25 text-white placeholder:text-white/50 focus:outline-none focus:border-white/60 focus:bg-white/20 transition-all shadow-inner shadow-black/5"
            />
            <input
              type="email"
              name="email"
              placeholder="Email address"
              required
              autoComplete="off"
              className="flex-1 px-4 py-3 rounded-lg backdrop-blur-sm bg-white/15 border border-white/25 text-white placeholder:text-white/50 focus:outline-none focus:border-white/60 focus:bg-white/20 transition-all shadow-inner shadow-black/5"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className={`px-8 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${buttonClasses}`}
            >
              {buttonText}
            </button>
          </div>

          {/* Honeypot fields to trick spam bots - keep hidden */}
          <div aria-hidden="true" className="hidden">
            <input
              name="phone"
              id="newsletter-phone"
              defaultValue="(813) 555-0199"
              placeholder="Phone"
              autoComplete="off"
            />
            <input
              type="email"
              defaultValue=""
              name="verify_email"
              id="newsletter-verify-email"
              placeholder="Verify Email Address"
              autoComplete="off"
            />
          </div>
        </form>

        <p className="mt-8 text-sm text-white/70">
          Visit{" "}
          <a
            href="https://www.tampadevs.com/"
            className="underline text-white hover:text-white/90"
          >
            our website
          </a>{" "}
          to learn more about Tampa Devs' charitable mission.
        </p>
      </div>
    </section>
  );
}
