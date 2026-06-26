"use client";

import { useState, useRef, useEffect } from "react";

export const GEMINI_MODELS = [
  {
    id:       "gemini-2.5-flash",
    short:    "Flash",
    label:    "2.5 Flash",
    subtitle: "Fast & balanced · $1.00/M tokens",
  },
  {
    id:       "gemini-2.5-flash-lite",
    short:    "Flash Lite",
    label:    "2.5 Flash Lite",
    subtitle: "Cheapest option · $0.30/M tokens",
  },
  {
    id:       "gemini-2.5-pro",
    short:    "Pro",
    label:    "2.5 Pro",
    subtitle: "Most accurate · $1.25/M tokens",
  },
] as const;

export type ModelId = typeof GEMINI_MODELS[number]["id"];

export default function ModelSelector({
  value,
  onChange,
  size = "default",
  direction = "down",
}: {
  value: ModelId;
  onChange: (id: ModelId) => void;
  size?: "default" | "sm";
  direction?: "down" | "up";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = GEMINI_MODELS.find((m) => m.id === value) ?? GEMINI_MODELS[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const btnCls = size === "sm"
    ? "flex items-center gap-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
    : "flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg px-3 text-sm font-medium transition-colors whitespace-nowrap w-full h-full";

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={btnCls}>
        {selected.short}
        {/* Chevron */}
        <svg
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""} ${size === "sm" ? "w-3 h-3" : "w-4 h-4"}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className={`absolute right-0 z-50 min-w-[220px] bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden ${direction === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}>
          {GEMINI_MODELS.map((m) => {
            const isSelected = m.id === value;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => { onChange(m.id); setOpen(false); }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left"
              >
                {/* Checkmark column */}
                <span className="mt-0.5 w-4 shrink-0">
                  {isSelected && (
                    <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                <span>
                  <span className={`block text-sm font-semibold ${isSelected ? "text-white" : "text-gray-200"}`}>
                    {m.label}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">{m.subtitle}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
