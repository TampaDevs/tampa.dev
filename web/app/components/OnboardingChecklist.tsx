/**
 * Onboarding Checklist Component
 *
 * A floating, dismissible checklist that appears in the bottom-right corner.
 * Shows new users a set of steps to get started with the platform.
 * Each step can be completed or dismissed, and the whole checklist can be dismissed.
 */

import { useState, useEffect } from "react";

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  dismissed: boolean;
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  onDismiss: (stepKey: string) => void;
  onDismissAll: () => void;
}

export function OnboardingChecklist({
  steps,
  onDismiss,
  onDismissAll,
}: OnboardingChecklistProps) {
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Slide-up animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;

  function handleDismissAll() {
    setVisible(false);
    // Delay the callback slightly so the animation plays
    setTimeout(() => onDismissAll(), 300);
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] transition-all duration-300 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0"
      }`}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  collapsed ? "-rotate-90" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Getting Started
              </h3>
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {completedCount} of {totalCount} complete
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismissAll}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Dismiss checklist"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-coral to-coral-light transition-all duration-500"
            style={{
              width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
            }}
          />
        </div>

        {/* Steps list */}
        {!collapsed && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
            {steps.map((step) => (
              <div
                key={step.key}
                className={`px-4 py-3 flex items-start gap-3 ${
                  step.completed ? "opacity-70" : ""
                }`}
              >
                {/* Checkbox */}
                <div className="shrink-0 mt-0.5">
                  {step.completed ? (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      step.completed
                        ? "line-through text-gray-400 dark:text-gray-500"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      step.completed
                        ? "text-gray-400 dark:text-gray-600"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>

                {/* Dismiss individual step (only if not completed) */}
                {!step.completed && (
                  <button
                    type="button"
                    onClick={() => onDismiss(step.key)}
                    className="shrink-0 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors"
                    title="Dismiss step"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dismiss footer */}
        {!collapsed && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={handleDismissAll}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Dismiss checklist
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
