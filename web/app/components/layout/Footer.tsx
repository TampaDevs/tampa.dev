import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
              Tampa<span className="text-coral">.dev</span>
            </Link>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
              The Tampa Bay tech events calendar for developers, founders, and
              startup builders. Aggregating events from independent communities
              across Tampa, St.&nbsp;Petersburg, and Clearwater.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Explore
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  to="/docs/platform"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  Platform Guide
                </Link>
              </li>
              <li>
                <Link
                  to="/calendar"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  Events Calendar
                </Link>
              </li>
              <li>
                <Link
                  to="/groups"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  Tech Groups
                </Link>
              </li>
              <li>
                <Link
                  to="/map"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  Event Map
                </Link>
              </li>
              <li>
                <Link
                  to="/tampa-bay-tech-events"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  Tampa Bay Tech Events
                </Link>
              </li>
              <li>
                <Link
                  to="/tampa-startup-events"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  Startup Events
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Community
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  to="/tampa-developer-meetups"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  Developer Meetups
                </Link>
              </li>
              <li>
                <Link
                  to="/tampa-founder-meetups"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  Founder Meetups
                </Link>
              </li>
              <li>
                <Link
                  to="/tampa-startup-ecosystem"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  Startup Ecosystem
                </Link>
              </li>
              <li>
                <a
                  href="https://tampadevs.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  About Tampa Devs
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/TampaDevs/tampa.dev/issues/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  Add Your Group
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Build
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  to="/builders"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  For Builders
                </Link>
              </li>
              <li>
                <Link
                  to="/developer/docs"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  API Docs
                </Link>
              </li>
              <li>
                <Link
                  to="/developer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  Developer Portal
                </Link>
              </li>
              <li>
                <Link
                  to="/developer/docs/mcp-overview"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  MCP Server
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/TampaDevs/tampa.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                >
                  Open Source
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-500">
              &copy; {new Date().getFullYear()} Tampa Devs. All rights reserved.
            </p>
            <Link
              to="/policies/privacy"
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Privacy
            </Link>
            <Link
              to="/policies/terms"
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Terms
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/TampaDevs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="sr-only">GitHub</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
            <a
              href="https://go.tampa.dev/slack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="sr-only">Slack</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
