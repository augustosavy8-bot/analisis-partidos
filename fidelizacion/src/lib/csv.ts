/** CSV para Excel en español: separador ";" y BOM UTF-8 para que respete los acentos. */
export function aCSV(filas: (string | number | null | undefined)[][]): string {
  const celda = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    // Evita inyección de fórmulas al abrir en Excel.
    const seguro = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  return "﻿" + filas.map((f) => f.map(celda).join(";")).join("\r\n") + "\r\n";
}
