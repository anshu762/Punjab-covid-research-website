"use client";

import React, { useEffect, useState } from "react";
import { METHOD_SECTIONS } from "@/content/methods";
import { ChevronDown, List } from "lucide-react";

export function MethodsTableOfContents() {
  const [activeId, setActiveId] = useState<string>(METHOD_SECTIONS[0]?.id || "purpose");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: "-20% 0px -70% 0px",
      threshold: 0,
    });

    METHOD_SECTIONS.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleLinkClick = (id: string) => {
    setActiveId(id);
    setMobileOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Mobile Collapsible Drawer */}
      <div className="md:hidden mb-6 p-3 bg-surface rounded-xl border border-border shadow-xs">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-full flex items-center justify-between text-sm font-semibold text-ink py-1"
          aria-expanded={mobileOpen}
        >
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-blue-600" />
            <span>Table of Contents</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted transition-transform duration-200 ${
              mobileOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {mobileOpen && (
          <nav className="mt-3 pt-3 border-t border-border flex flex-col gap-1 max-h-64 overflow-y-auto">
            {METHOD_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => handleLinkClick(section.id)}
                className={`text-left text-xs px-2.5 py-1.5 rounded-md transition-colors ${
                  activeId === section.id
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-muted hover:text-ink hover:bg-surface-2"
                }`}
              >
                {section.title}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:block w-64 shrink-0">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-4 bg-surface rounded-xl border border-border shadow-xs">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
            <List className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
              Methodology Index
            </h3>
          </div>
          <nav className="flex flex-col gap-1 text-xs" aria-label="Methods Navigation">
            {METHOD_SECTIONS.map((section) => {
              const isActive = activeId === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleLinkClick(section.id)}
                  aria-current={isActive ? "location" : undefined}
                  className={`text-left px-2.5 py-2 rounded-lg transition-all text-[12px] leading-snug ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600 pl-2 shadow-2xs"
                      : "text-slate-600 hover:text-ink hover:bg-surface-2"
                  }`}
                >
                  {section.shortTitle}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
