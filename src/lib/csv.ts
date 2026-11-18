/**
 * CSV pensado para abrir con doble clic en Excel (configuración regional es-CO):
 * separador `;` (Excel en español no usa `,`), fin de línea `\r\n`, BOM UTF-8 para
 * que las tildes no salgan rotas y TODAS las celdas entre comillas con `"` duplicada,
 * así un `;`, salto de línea o comilla dentro del texto nunca parte la columna.
 */
export type CeldaCsv = string | number | null | undefined

const BOM = "﻿"

function celda(valor: CeldaCsv) {
  return `"${String(valor ?? "").replaceAll('"', '""')}"`
}

/** Texto del CSV (sin BOM). Puro: lo usa `exportarCsv` y los tests. */
export function aCsv(cabecera: CeldaCsv[], filas: CeldaCsv[][]) {
  return [cabecera, ...filas].map((fila) => fila.map(celda).join(";")).join("\r\n")
}

/** Nombre de archivo sin caracteres que Windows rechaza (`\ / : * ? " < > |`). */
export function nombreArchivoSeguro(nombre: string, extra = "") {
  return nombre.replace(new RegExp(`[\\/:*?"<>|${extra}]+`, "g"), "-")
}

/** Arma el CSV con BOM y dispara la descarga en el navegador. */
export function exportarCsv(archivo: string, cabecera: CeldaCsv[], filas: CeldaCsv[][]) {
  const blob = new Blob([BOM + aCsv(cabecera, filas)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  Object.assign(document.createElement("a"), { href: url, download: archivo }).click()
  URL.revokeObjectURL(url)
}
