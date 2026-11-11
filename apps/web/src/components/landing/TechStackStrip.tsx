import React from "react";

const TECHNOLOGIES = [
  "Next.js (App Router)",
  "TypeScript",
  "Tailwind CSS",
  "Prisma ORM",
  "Neon Postgres",
  "FastAPI",
  "SciPy & NumPy",
  "Plotly",
  "OpenRouter AI",
] as const;

export function TechStackStrip() {
  return (
    <section id="stack" className="py-12 bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <p className="text-center text-xs font-semibold text-muted uppercase tracking-wider mb-6">
          Architected on Modern Open-Source Research Infrastructure
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {TECHNOLOGIES.map((tech) => (
            <span
              key={tech}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-700 bg-surface-2 border border-border shadow-2xs hover:border-slate-300 transition-colors"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
