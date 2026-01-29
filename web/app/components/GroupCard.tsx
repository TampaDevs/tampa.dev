import { Link } from "react-router";
import type { LocalGroupCompat } from "~/lib/api.server";
import { FavoriteButton } from "./FavoriteButton";

interface GroupCardProps {
  group: LocalGroupCompat;
  eventCount?: number;
}

export function GroupCard({ group, eventCount }: GroupCardProps) {
  return (
    <Link
      to={`/groups/${group.slug}`}
      className="block glass-card rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
    >
      <div className="aspect-video relative bg-gray-100 dark:bg-gray-800">
        <img
          src={group.logo}
          alt={group.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "/images/placeholder-group.svg";
          }}
        />
        {eventCount !== undefined && eventCount > 0 && (
          <div className="absolute top-3 right-3 backdrop-blur-md bg-coral/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg shadow-coral/25 border border-coral-light/30">
            {eventCount} upcoming
          </div>
        )}
        <div className="absolute bottom-1.5 right-1.5">
          <FavoriteButton slug={group.slug} size="small" />
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
          {group.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {group.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {group.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-navy/5 dark:bg-white/10 text-navy/70 dark:text-gray-300 border border-navy/10 dark:border-white/10"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
