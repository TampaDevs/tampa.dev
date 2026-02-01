/**
 * Admin Achievements Management Page
 *
 * Create, edit, and delete achievements from the admin panel.
 */

import { useLoaderData, useFetcher } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/admin.achievements";
import { Emoji } from "~/components/Emoji";
import { EmojiSelect } from "~/components/EmojiSelect";

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  targetValue: number;
  points: number;
  badgeSlug: string | null;
  entitlement: string | null;
  eventType: string;
  sortOrder: number;
  conditions: string | null;
  progressMode: string | null;
  gaugeField: string | null;
  hidden: number;
  enabled: number;
  createdAt: string;
  userCount?: number;
  completedCount?: number;
}

interface Condition {
  field: string;
  op: string;
  value: string;
}

interface BadgeOption {
  id: string;
  slug: string;
  name: string;
  icon: string;
}

const API_HOST = import.meta.env.EVENTS_API_URL || "https://api.tampa.dev";

const KNOWN_EVENT_TYPES = [
  'dev.tampa.events.synced',
  'dev.tampa.sync.completed',
  'dev.tampa.user.favorite_added',
  'dev.tampa.user.favorite_removed',
  'dev.tampa.user.profile_updated',
  'dev.tampa.user.portfolio_item_created',
  'dev.tampa.user.identity_linked',
  'dev.tampa.user.registered',
  'dev.tampa.user.deleted',
  'dev.tampa.achievement.unlocked',
  'dev.tampa.badge.issued',
  'dev.tampa.user.score_changed',
  'dev.tampa.user.login',
  'dev.tampa.user.followed',
  'dev.tampa.developer.api_token_created',
  'dev.tampa.developer.webhook_created',
  'dev.tampa.developer.application_registered',
  'dev.tampa.onboarding.step_completed',
  'test.ping',
];

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || undefined;

  const [achievementsResponse, badgesResponse] = await Promise.all([
    fetch(`${API_HOST}/admin/achievements`, {
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }),
    fetch(`${API_HOST}/admin/badges`, {
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }),
  ]);

  if (!achievementsResponse.ok) {
    throw new Error(`Admin API request failed: ${achievementsResponse.status}`);
  }

  const achievementsJson = (await achievementsResponse.json()) as { data: Achievement[] };

  let badges: BadgeOption[] = [];
  if (badgesResponse.ok) {
    const badgesJson = (await badgesResponse.json()) as { data: BadgeOption[] };
    badges = badgesJson.data;
  }

  return { achievements: achievementsJson.data, badges };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const cookieHeader = request.headers.get("Cookie") || undefined;

  if (intent === "create") {
    const key = formData.get("key") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const icon = formData.get("icon") as string;
    const color = formData.get("color") as string;
    const targetValue = Number(formData.get("targetValue") || "1");
    const points = Number(formData.get("points") || "0");
    const badgeSlug = formData.get("badgeSlug") as string;
    const entitlement = formData.get("entitlement") as string;
    const eventType = formData.get("eventType") as string;
    const sortOrder = Number(formData.get("sortOrder") || "0");
    const conditionsRaw = formData.get("conditions") as string;
    const progressMode = formData.get("progressMode") as string;
    const gaugeField = formData.get("gaugeField") as string;
    const hiddenVal = formData.get("hidden") === "1";
    const enabledVal = formData.get("enabled") !== "0";

    try {
      const response = await fetch(`${API_HOST}/admin/achievements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({
          key,
          name,
          description: description || undefined,
          icon,
          color,
          targetValue,
          points,
          badgeSlug: badgeSlug || undefined,
          entitlement: entitlement || undefined,
          eventType,
          sortOrder,
          conditions: conditionsRaw || undefined,
          progressMode: progressMode || undefined,
          gaugeField: gaugeField || undefined,
          hidden: hiddenVal,
          enabled: enabledVal,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
        throw new Error(errorData.error || `Failed to create achievement: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create achievement" };
    }
  }

  if (intent === "update") {
    const id = formData.get("achievementId") as string;
    const key = formData.get("key") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const icon = formData.get("icon") as string;
    const color = formData.get("color") as string;
    const targetValue = Number(formData.get("targetValue") || "1");
    const points = Number(formData.get("points") || "0");
    const badgeSlug = formData.get("badgeSlug") as string;
    const entitlement = formData.get("entitlement") as string;
    const eventType = formData.get("eventType") as string;
    const sortOrder = Number(formData.get("sortOrder") || "0");
    const conditionsRaw = formData.get("conditions") as string;
    const progressMode = formData.get("progressMode") as string;
    const gaugeField = formData.get("gaugeField") as string;
    const hiddenVal = formData.get("hidden") === "1";
    const enabledVal = formData.get("enabled") !== "0";

    try {
      const response = await fetch(
        `${API_HOST}/admin/achievements/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          body: JSON.stringify({
            key,
            name,
            description: description || undefined,
            icon,
            color,
            targetValue,
            points,
            badgeSlug: badgeSlug || undefined,
            entitlement: entitlement || undefined,
            eventType,
            sortOrder,
            conditions: conditionsRaw || undefined,
            progressMode: progressMode || undefined,
            gaugeField: gaugeField || undefined,
            hidden: hiddenVal,
            enabled: enabledVal,
          }),
        }
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
        throw new Error(errorData.error || `Failed to update achievement: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update achievement" };
    }
  }

  if (intent === "delete") {
    const id = formData.get("achievementId") as string;
    try {
      const response = await fetch(
        `${API_HOST}/admin/achievements/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
        }
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
        throw new Error(errorData.error || `Failed to delete achievement: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to delete achievement" };
    }
  }

  return { success: false };
}

function AchievementForm({
  achievement,
  onCancel,
  badges,
}: {
  achievement?: Achievement;
  onCancel: () => void;
  badges: BadgeOption[];
}) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";
  const actionData = fetcher.data as { success?: boolean; error?: string } | undefined;

  const [key, setKey] = useState(achievement?.key || "");
  const [color, setColor] = useState(achievement?.color || "#E5574F");
  const [progressMode, setProgressMode] = useState(achievement?.progressMode || "counter");
  const [gaugeField, setGaugeField] = useState(achievement?.gaugeField || "");
  const [hidden, setHidden] = useState(achievement?.hidden ? true : false);
  const [enabled, setEnabled] = useState(achievement ? !!achievement.enabled : true);

  // Parse conditions from JSON string
  const initialConditions: Condition[] = (() => {
    if (!achievement?.conditions) return [];
    try {
      const parsed = JSON.parse(achievement.conditions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const [conditions, setConditions] = useState<Condition[]>(initialConditions);

  const addCondition = () => {
    setConditions([...conditions, { field: "", op: "eq", value: "" }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    setConditions(conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  };

  const initialEventType = achievement?.eventType || "";
  const isInitialCustom = initialEventType !== "" && !KNOWN_EVENT_TYPES.includes(initialEventType);
  const [useCustomEventType, setUseCustomEventType] = useState(isInitialCustom);
  const [customEventType, setCustomEventType] = useState(isInitialCustom ? initialEventType : "");
  const [selectedEventType, setSelectedEventType] = useState(isInitialCustom ? "__custom__" : initialEventType);

  const handleNameChange = (name: string) => {
    if (!achievement) {
      // Auto-generate key from name for new achievements
      setKey(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
      );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {achievement ? "Edit Achievement" : "Create Achievement"}
      </h3>

      {actionData?.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{actionData.error}</p>
        </div>
      )}

      <fetcher.Form method="post" className="space-y-4">
        <input type="hidden" name="intent" value={achievement ? "update" : "create"} />
        {achievement && <input type="hidden" name="achievementId" value={achievement.id} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="achievement-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              id="achievement-name"
              name="name"
              type="text"
              required
              defaultValue={achievement?.name || ""}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>

          <div>
            <label htmlFor="achievement-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Key
            </label>
            <input
              id="achievement-key"
              name="key"
              type="text"
              required
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="e.g. first_event_attended"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>

          <div>
            <label htmlFor="achievement-icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Icon (emoji)
            </label>
            <input
              id="achievement-icon"
              name="icon"
              type="text"
              required
              defaultValue={achievement?.icon || ""}
              placeholder="e.g. ⭐"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>

          <div>
            <label htmlFor="achievement-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                id="achievement-color"
                name="color"
                type="text"
                required
                value={color}
                onChange={(e) => setColor(e.target.value)}
                pattern="^#[0-9A-Fa-f]{6}$"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
              />
            </div>
          </div>

          <div>
            <label htmlFor="achievement-targetValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Value
            </label>
            <input
              id="achievement-targetValue"
              name="targetValue"
              type="number"
              min="1"
              required
              defaultValue={achievement?.targetValue ?? 1}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>

          <div>
            <label htmlFor="achievement-points" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Points (XP)
            </label>
            <input
              id="achievement-points"
              name="points"
              type="number"
              min="0"
              defaultValue={achievement?.points ?? 0}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>

          <div>
            <label htmlFor="achievement-badgeSlug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Badge Slug (auto-award)
            </label>
            <EmojiSelect
              id="achievement-badgeSlug"
              name="badgeSlug"
              freeform
              defaultValue={achievement?.badgeSlug || ""}
              placeholder="Select existing or type new slug"
              options={badges.map((b) => ({
                value: b.slug,
                label: b.name,
                emoji: b.icon,
              }))}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Type a new slug to auto-create the badge on first trigger, or pick an existing one.
            </p>
          </div>

          <div>
            <label htmlFor="achievement-entitlement" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Entitlement Key
            </label>
            <input
              id="achievement-entitlement"
              name="entitlement"
              type="text"
              defaultValue={achievement?.entitlement || ""}
              placeholder="e.g. premium_access"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>

          <div>
            <label htmlFor="achievement-eventType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Event Type
            </label>
            <input
              type="hidden"
              name="eventType"
              value={useCustomEventType ? customEventType : selectedEventType}
            />
            <select
              id="achievement-eventType"
              value={selectedEventType}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedEventType(val);
                if (val === "__custom__") {
                  setUseCustomEventType(true);
                } else {
                  setUseCustomEventType(false);
                  setCustomEventType("");
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            >
              <option value="">Select event type...</option>
              {KNOWN_EVENT_TYPES.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
              <option value="__custom__">Custom...</option>
            </select>
            {useCustomEventType && (
              <input
                type="text"
                value={customEventType}
                onChange={(e) => setCustomEventType(e.target.value)}
                placeholder="e.g. dev.tampa.custom.event_type"
                required
                className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
              />
            )}
          </div>

          <div>
            <label htmlFor="achievement-sort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort Order
            </label>
            <input
              id="achievement-sort"
              name="sortOrder"
              type="number"
              min="0"
              defaultValue={achievement?.sortOrder ?? 0}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            />
          </div>
        </div>

        <div>
          <label htmlFor="achievement-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            id="achievement-desc"
            name="description"
            rows={2}
            maxLength={500}
            defaultValue={achievement?.description || ""}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral resize-none"
          />
        </div>

        {/* Enabled toggle */}
        <div className="flex items-center gap-3">
          <input type="hidden" name="enabled" value={enabled ? "1" : "0"} />
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enabled
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Disabled achievements won&apos;t be evaluated or award progress
            </p>
          </div>
        </div>

        {/* Hidden Achievement toggle */}
        <div className="flex items-center gap-3">
          <input type="hidden" name="hidden" value={hidden ? "1" : "0"} />
          <button
            type="button"
            role="switch"
            aria-checked={hidden}
            onClick={() => setHidden(!hidden)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              hidden ? "bg-coral" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                hidden ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Hidden Achievement
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Only visible to users who earned it (Xbox/PSN style)
            </p>
          </div>
        </div>

        {/* Progress Mode selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="achievement-progressMode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Progress Mode
            </label>
            <input type="hidden" name="progressMode" value={progressMode} />
            <select
              id="achievement-progressMode"
              value={progressMode}
              onChange={(e) => setProgressMode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
            >
              <option value="counter">Counter &mdash; increment by 1 per event</option>
              <option value="gauge">Gauge &mdash; read absolute value from event payload</option>
            </select>
          </div>

          {/* Gauge Field input (shown conditionally) */}
          {progressMode === "gauge" && (
            <div>
              <label htmlFor="achievement-gaugeField" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payload Field Path
              </label>
              <input
                id="achievement-gaugeField"
                name="gaugeField"
                type="text"
                value={gaugeField}
                onChange={(e) => setGaugeField(e.target.value)}
                placeholder="totalScore"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-coral/50 focus:border-coral"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Dot-path to the payload field to use as the progress value
              </p>
            </div>
          )}
        </div>

        {/* Conditions editor */}
        <div>
          <input
            type="hidden"
            name="conditions"
            value={conditions.length > 0 ? JSON.stringify(conditions) : ""}
          />
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Conditions
          </label>
          {conditions.length > 0 && (
            <div className="space-y-2 mb-3">
              {conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={condition.field}
                    onChange={(e) => updateCondition(index, { field: e.target.value })}
                    placeholder="groupSlug"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-coral/50 focus:border-coral"
                  />
                  <select
                    value={condition.op}
                    onChange={(e) => updateCondition(index, { op: e.target.value })}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-coral/50 focus:border-coral"
                  >
                    <option value="eq">eq</option>
                    <option value="neq">neq</option>
                    <option value="gt">gt</option>
                    <option value="gte">gte</option>
                    <option value="lt">lt</option>
                    <option value="lte">lte</option>
                    <option value="in">in</option>
                    <option value="contains">contains</option>
                  </select>
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    placeholder="value"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-coral/50 focus:border-coral"
                  />
                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove condition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addCondition}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Condition
          </button>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : achievement ? "Update Achievement" : "Create Achievement"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </fetcher.Form>
    </div>
  );
}

function AchievementCard({ achievement, onEdit }: { achievement: Achievement; onEdit: () => void }) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== "idle";

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4${!achievement.enabled ? " opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${achievement.color}20` }}
          >
            <Emoji emoji={achievement.icon} size={24} />
          </span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {achievement.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {achievement.key}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{ backgroundColor: `${achievement.color}20`, color: achievement.color }}
          >
            {achievement.userCount ?? 0} users
          </span>
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
          >
            {achievement.completedCount ?? 0} completed
          </span>
        </div>
      </div>

      {achievement.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {achievement.description}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
          Target: {achievement.targetValue}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
          Event: {achievement.eventType}
        </span>
        {achievement.points > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded">
            {achievement.points} XP
          </span>
        )}
        {achievement.badgeSlug && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
            Badge: {achievement.badgeSlug}
          </span>
        )}
        {achievement.entitlement && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
            Entitlement: {achievement.entitlement}
          </span>
        )}
        {!achievement.enabled && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Disabled
          </span>
        )}
        {!!achievement.hidden && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
            Hidden
          </span>
        )}
        {achievement.progressMode === "gauge" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">
            Gauge: {achievement.gaugeField || "—"}
          </span>
        )}
        {achievement.conditions && (() => {
          try {
            const parsed = JSON.parse(achievement.conditions);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded">
                  {parsed.length} condition{parsed.length !== 1 ? "s" : ""}
                </span>
              );
            }
            return null;
          } catch {
            return null;
          }
        })()}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {/* Preview */}
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: achievement.color }}
        >
          <Emoji emoji={achievement.icon} size={14} /> {achievement.name}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onEdit}
            className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Edit
          </button>
          <fetcher.Form
            method="post"
            onSubmit={(e) => {
              if (!confirm(`Delete achievement "${achievement.name}"? This will remove it from all users.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="achievementId" value={achievement.id} />
            <button
              type="submit"
              disabled={isDeleting}
              className="px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting ? "..." : "Delete"}
            </button>
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}

export default function AdminAchievementsPage() {
  const { achievements, badges } = useLoaderData<typeof loader>();
  const [showForm, setShowForm] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | undefined>();

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAchievement(undefined);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Achievements
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {achievements.length} achievement{achievements.length !== 1 ? "s" : ""} defined
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditingAchievement(undefined); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg font-medium hover:bg-coral-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Achievement
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <AchievementForm achievement={editingAchievement} onCancel={handleCancel} badges={badges} />
        </div>
      )}

      {achievements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              onEdit={() => handleEdit(achievement)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
            No achievements yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create your first achievement to track community milestones.
          </p>
        </div>
      )}
    </div>
  );
}
