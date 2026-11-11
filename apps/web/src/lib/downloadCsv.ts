/**
 * Client-side CSV file generator with formula injection protection.
 */

const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

export function neutralizeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const str = String(value);
  if (str.length > 0 && FORMULA_TRIGGERS.includes(str[0])) {
    // If it's a valid number string like "-15" or "+42", spreadsheets treat it as a number
    if (!isNaN(Number(str))) {
      return str;
    }
    return `'${str}`;
  }
  return str;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const cleanFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;

  const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",");
  const dataLines = rows.map((row) =>
    row
      .map((cell) => {
        const val = neutralizeCell(cell);
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csvContent = [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", cleanFilename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
