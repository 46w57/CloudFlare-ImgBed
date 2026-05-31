import { useState } from "react";
import { ChevronDown, ChevronRight, Search, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/store/chatStore";

interface SearchPanelProps {
  searchResults: SearchResult[];
}

export default function SearchPanel({ searchResults }: SearchPanelProps) {
  if (!searchResults || searchResults.length === 0) return null;

  return (
    <div className="my-2 space-y-2">
      {searchResults.map((sr, idx) => (
        <SearchResultItem key={idx} searchResult={sr} />
      ))}
    </div>
  );
}

function SearchResultItem({ searchResult }: { searchResult: SearchResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
          "hover:bg-[var(--border)] text-[var(--text-secondary)]"
        )}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <Search className="h-4 w-4 shrink-0 text-[var(--blue)]" />
        <span className="font-medium">搜索: {searchResult.query}</span>
        <span className="ml-auto text-xs text-[var(--text-secondary)]">
          {searchResult.results?.length || 0} 条结果
        </span>
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-3">
          {searchResult.results?.map((r, i) => (
            <div key={i} className="group">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm font-medium text-[var(--blue)] hover:underline"
              >
                <span>{r.title}</span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)] line-clamp-2">
                {r.snippet}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
