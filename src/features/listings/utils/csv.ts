/** Reads CSV the way spreadsheets write it: quoted cells may hold commas, quotes ("") and line breaks. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (src[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) rows.push([...row, cell]);
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const escape = (cell: string) => (/[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);

export const toCsv = (rows: string[][]): string => rows.map((r) => r.map(escape).join(",")).join("\r\n") + "\r\n";

/** Downloads text as a file from the browser. */
export function downloadCsv(filename: string, rows: string[][]) {
  const url = URL.createObjectURL(new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
