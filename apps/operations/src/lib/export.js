/**
 * CSV export of rows already on screen.
 *
 * The admin had a row of export buttons that only raised a toast saying a file
 * was being prepared. Nothing was ever produced. These write the rows the
 * operator is looking at, which is a real operation the browser can complete
 * without any endpoint behind it.
 *
 * Where an export would need something the API does not offer, such as a
 * rendered PDF invoice, the control is removed rather than faked.
 */

/** Escapes one value for CSV: quotes wrap it, inner quotes double. */
function cell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  // A leading =, +, - or @ is treated as a formula by spreadsheet software,
  // so it is prefixed with a quote to keep it inert.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Builds a CSV and hands it to the browser as a download.
 *
 * `columns` is `[{ header, value }]` where `value` reads one row. Returns the
 * number of rows written so the caller can report it honestly.
 */
export function downloadCsv({ filename, columns, rows }) {
  const header = columns.map((c) => cell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => cell(c.value(row))).join(',')).join('\n');
  // The BOM makes Excel open UTF-8 correctly; without it rupee signs mangle.
  const blob = new Blob([`﻿${header}\n${body}\n`], { type: 'text/csv;charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return rows.length;
}

/** `everwear-customers-2026-10-31.csv` */
export const datedFilename = (name) =>
  `everwear-${name}-${new Date().toISOString().slice(0, 10)}`;
