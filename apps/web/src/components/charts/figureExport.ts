"use client";

import { setPngDpi } from "@epilens/shared";

export interface ExportFigureOptions {
  format: "png" | "svg";
  title: string;
  filename: string;
  caption?: string;
  period?: string;
  assumptions?: string;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(",");
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, "_").toLowerCase();
}

/**
 * Exports a Plotly figure as publication-grade 300 DPI PNG or SVG.
 * Strictly adheres to PRD §3 and AGENTS.md §6 requirements:
 * 1. Temporarily adds a bottom caption annotation block (title, caption, period, assumptions).
 * 2. Renders via Plotly.toImage at scale 2.5 (3000x1688 px = 300 DPI at 10x5.625 in).
 * 3. Injects pHYs chunk (11811 pixels/metre) for PNG metadata compliance.
 * 4. Restores original layout and triggers download.
 */
interface PlotlyGraphElement extends HTMLElement {
  layout?: {
    margin?: { b?: number };
    annotations?: Array<Record<string, unknown>>;
  };
}

interface PlotlyInstance {
  relayout: (gd: HTMLElement, update: Record<string, unknown>) => Promise<unknown>;
  toImage: (gd: HTMLElement, opts: Record<string, unknown>) => Promise<string>;
}

export async function exportFigure(
  graphDiv: HTMLElement,
  options: ExportFigureOptions
): Promise<void> {
  const win = window as unknown as { Plotly?: PlotlyInstance };
  const plotlyModule = await import("plotly.js-basic-dist-min");
  const Plotly = win.Plotly || (plotlyModule.default as unknown as PlotlyInstance) || (plotlyModule as unknown as PlotlyInstance);

  const gd = graphDiv as PlotlyGraphElement;
  if (!gd || !Plotly) {
    throw new Error("Plotly graph element not initialized");
  }

  const originalMarginB = gd.layout?.margin?.b ?? 50;
  const originalAnnotations = gd.layout?.annotations ? [...gd.layout.annotations] : [];

  // Compose export footer text
  const parts: string[] = [];
  if (options.period) parts.push(`Period: ${options.period}`);
  if (options.assumptions) parts.push(`Assumptions: ${options.assumptions}`);
  const metaLine = parts.join(" | ");

  const exportAnnotations = [
    ...originalAnnotations,
    {
      text: `<b>${options.title}</b> — EpiLens Research Archive`,
      xref: "paper",
      yref: "paper",
      x: 0,
      y: -0.22,
      xanchor: "left",
      yanchor: "top",
      showarrow: false,
      font: { size: 11, color: "#0F172A", family: "Inter, sans-serif" },
    },
    {
      text: `${options.caption || ""}${metaLine ? `<br><i>${metaLine}</i>` : ""}`,
      xref: "paper",
      yref: "paper",
      x: 0,
      y: -0.29,
      xanchor: "left",
      yanchor: "top",
      showarrow: false,
      font: { size: 9, color: "#64748B", family: "Inter, sans-serif" },
    },
  ];

  try {
    // 1. Temporarily update layout
    await Plotly.relayout(gd, {
      "margin.b": Math.max(originalMarginB, 110),
      annotations: exportAnnotations,
    });

    const sanitizedBase = sanitizeFilename(options.filename);

    if (options.format === "png") {
      // 2. Plotly.toImage: width 1200 x height 675 at scale 2.5 = 3000 x 1688 px
      const dataUrl: string = await Plotly.toImage(gd, {
        format: "png",
        width: 1200,
        height: 675,
        scale: 2.5,
      });

      // 3. Inject 300 DPI pHYs chunk
      const rawBytes = dataUrlToBytes(dataUrl);
      const dpiBytes = setPngDpi(rawBytes, 300);

      const blob = new Blob([dpiBytes.buffer as ArrayBuffer], { type: "image/png" });
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${sanitizedBase}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } else {
      // SVG export
      const svgDataUrl: string = await Plotly.toImage(gd, {
        format: "svg",
        width: 1200,
        height: 675,
        scale: 1,
      });

      let svgBlob: Blob;
      if (svgDataUrl.startsWith("data:image/svg+xml,")) {
        const svgContent = decodeURIComponent(svgDataUrl.slice("data:image/svg+xml,".length));
        svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      } else if (svgDataUrl.startsWith("data:image/svg+xml;base64,")) {
        const bytes = dataUrlToBytes(svgDataUrl);
        svgBlob = new Blob([bytes.buffer as ArrayBuffer], { type: "image/svg+xml;charset=utf-8" });
      } else {
        svgBlob = new Blob([svgDataUrl], { type: "image/svg+xml;charset=utf-8" });
      }

      const objectUrl = URL.createObjectURL(svgBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${sanitizedBase}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    }
  } finally {
    // 4. Restore original layout
    await Plotly.relayout(gd, {
      "margin.b": originalMarginB,
      annotations: originalAnnotations,
    });
  }
}
