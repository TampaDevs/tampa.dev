import { Link, NavLink } from "react-router";
import React, { useState, useRef } from "react";
import { Avatar } from "@tampadevs/react";

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  githubUsername?: string;
}

interface HeaderProps {
  user?: User | null;
}

const navLinks = [
  { to: "/calendar", label: "Events" },
  { to: "/groups", label: "Groups" },
  { to: "/map", label: "Map" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/members", label: "Members" },
];

function LogoutButton({
  className,
  onClick,
  wrapperClassName,
}: {
  className?: string;
  onClick?: () => void;
  wrapperClassName?: string;
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleLogout = () => {
    setIsLoggingOut(true);
    onClick?.();
    // Submit the form natively (bypasses React Router's single-fetch CSRF check)
    formRef.current?.submit();
  };

  const form = (
    <form ref={formRef} method="post" action="/auth/logout" style={{ display: "contents" }}>
      <button
        type="button"
        disabled={isLoggingOut}
        onClick={handleLogout}
        className={className}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        {isLoggingOut ? "Signing out..." : "Sign out"}
      </button>
    </form>
  );

  if (wrapperClassName) {
    return <div className={wrapperClassName}>{form}</div>;
  }
  return form;
}

function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Avatar
          src={user.avatarUrl || undefined}
          name={user.name || user.email}
          size="sm"
        />
        <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-32 truncate">
          {user.name || user.email.split("@")[0]}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user.name || "User"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>
          <div className="py-1">
            <Link
              to="/profile"
              onClick={closeMenu}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </Link>
            <Link
              to="/favorites"
              onClick={closeMenu}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Favorites
            </Link>
            <Link
              to="/profile?tab=achievements"
              onClick={closeMenu}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l2.09 6.26L20.18 9l-5 4.09L16.82 20 12 16.54 7.18 20l1.64-6.91L3.82 9l6.09-.74z" />
              </svg>
              Achievements
            </Link>
            {(user.role === "admin" || user.role === "superadmin") && (
              <Link
                to="/admin"
                onClick={closeMenu}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin
              </Link>
            )}
          </div>
          <LogoutButton
            wrapperClassName="py-1 border-t border-gray-200 dark:border-gray-700"
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          />
        </div>
      )}
    </div>
  );
}

export function Header({ user }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm shadow-gray-200/20 dark:shadow-black/10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Tampa<span className="text-coral">.dev</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-navy/10 dark:bg-navy-light/30 text-navy dark:text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://talent.tampa.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Jobs
            </a>

            {user ? (
              <>
                <div className="hidden md:block">
                  <UserMenu user={user} />
                </div>
                <Link
                  to="/profile"
                  className="md:hidden flex items-center"
                >
                  <Avatar
                    src={user.avatarUrl || undefined}
                    name={user.name || user.email}
                    size="sm"
                  />
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/favorites"
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  Favorites
                </Link>

                <a
                  href="/#newsletter"
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
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
                  Subscribe
                </a>

                <Link
                  to="/login"
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-coral text-white hover:bg-coral-dark transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}

            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-navy/10 dark:bg-navy-light/30 text-navy dark:text-white"
                        : "text-gray-600 dark:text-gray-400"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <a
                href="https://talent.tampa.dev"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                Jobs
              </a>
              <Link
                to="/favorites"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                Favorites
              </Link>

              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/profile?tab=achievements"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400"
                  >
                    Achievements
                  </Link>
                  {(user.role === "admin" || user.role === "superadmin") && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      Admin
                    </Link>
                  )}
                  <LogoutButton
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400"
                  />
                </>
              ) : (
                <>
                  <a
                    href="/#newsletter"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400"
                  >
                    Subscribe
                  </a>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-coral"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
