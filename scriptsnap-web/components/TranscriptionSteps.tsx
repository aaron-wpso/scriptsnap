"use client";

const STEPS = ["Submitted", "Fetching audio", "Transcribing", "Done"];

export function statusToStep(status: string): number {
  if (status === "Pending")    return 1;
  if (status === "Processing") return 2;
  if (status === "Completed")  return 3;
  return 0;
}

export default function TranscriptionSteps({ status }: { status: string }) {
  const active = statusToStep(status);

  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const done    = i < active;
        const current = i === active;
        const waiting = i > active;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none min-w-0">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all
                ${done    ? "bg-green-500 text-white" : ""}
                ${current ? "bg-indigo-500 text-white ring-4 ring-indigo-500/30 animate-pulse" : ""}
                ${waiting ? "bg-gray-800 border border-gray-700 text-gray-600" : ""}
              `}>
                {done ? "✓" : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap
                ${done    ? "text-green-400" : ""}
                ${current ? "text-indigo-400" : ""}
                ${waiting ? "text-gray-600"   : ""}
              `}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-5 transition-colors
                ${i < active ? "bg-green-500" : "bg-gray-700"}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}
