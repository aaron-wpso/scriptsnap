"use client";

import { useState } from "react";

type Props = {
  src: string;
  className?: string;
};

export default function ThumbnailImage({ src, className = "" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt="Video thumbnail"
        onClick={() => setOpen(true)}
        className={`object-cover cursor-zoom-in ${className}`}
      />

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <img
            src={src}
            alt="Video thumbnail"
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain cursor-zoom-out"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
