import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX } from "@/lib/api-routes"
import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { downloadReport } from "@/lib/report-client"
import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"

// Reportes externos (DANE C600 y SIMAT; Sección 3.9, Regla 70). La estructura de cada reporte la
// define una versión (sso V781, hoy Provisional hasta que exista Configuración de Reportes).

const BASE = "/informes-reportes/reportes-externos"
const externosKeys = {
  all: [...informesKeys.all, "reportes-externos"] as const,
  versiones: [...informesKeys.all, "reportes-externos", "versiones"] as const,
  generados: (body: unknown) => [...informesKeys.all, "reportes-externos", "generados", body] as const,
}

/** Código del reporte según la opción del selector de informes. */
export const CODIGO_EXTERNO = { simat: "SIMAT", c600: "C600" } as const

export type FormatoExterno = "EXCEL" | "CSV" | "TEXTO"

export interface VersionExterna {
  reporteId: number
  codigo: string
  nombre: string
  version: string
  formato: FormatoExterno
  provisional: boolean
}

export interface Generado {
  generadoId: number
  reporte: string
  codigo: string
  version: string
  formato: FormatoExterno
  provisional: boolean
  establecimiento: string
  sede: string | null
  periodo: string
  corte: string | null
  filas: number
  faltantes: number
  filasConFaltantes: number
  sensiblesVacias: boolean
  estado: "COMPLETO" | "CON_FALTANTES"
  usuario: string | null
  fecha: string
  /** Encabezados del archivo en orden: los lleva la lista para no bajar el contenido solo por ellos. */
  encabezados: string[]
}

export interface Faltante {
  fila: number | null
  estudiante: string | null
  columna: string | null
  donde: string | null
}

export interface AvisoFaltantes {
  totalFilas: number
  filasConFaltantes: number
  faltantes: number
  sensiblesVacias: boolean
  detalle: Faltante[]
}

export interface GenerarExternoInput {
  reporte: number
  periodo: number
  soloSede: boolean
  corte: string | null
}

const cuerpo = (v: GenerarExternoInput) => ({ REPORTE: v.reporte, PERIODO: v.periodo, SOLO_SEDE: v.soloSede, CORTE: v.corte })

export function useVersionesExternasQuery() {
  return useQuery({
    queryKey: externosKeys.versiones,
    queryFn: async () => camelizar<VersionExterna[]>(await evalCol.getRows(`${BASE}/versiones`)),
    staleTime: 5 * 60_000,
  })
}

export function useGeneradosQuery(p: { pageIndex: number; pageSize: number }) {
  const body = { PAGEINDEX: p.pageIndex, PAGESIZE: p.pageSize }
  return useQuery({
    queryKey: externosKeys.generados(body),
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/generados/query`, body)
      return toPaginated(rows, { pageSize: p.pageSize, map: (r) => camelizar<Generado>(r) })
    },
    placeholderData: keepPreviousData,
  })
}

/** Aviso previo a generar: «Faltan N datos obligatorios en M filas» con el detalle. */
export function useFaltantesExterno() {
  return useMutation({
    mutationFn: async (v: GenerarExternoInput): Promise<AvisoFaltantes> => {
      const rows = camelizar<(Faltante & Omit<AvisoFaltantes, "detalle">)[]>(await evalCol.postRows(`${BASE}/faltantes`, cuerpo(v)))
      const t = rows[0]
      return {
        totalFilas: Number(t?.totalFilas ?? 0),
        filasConFaltantes: Number(t?.filasConFaltantes ?? 0),
        faltantes: Number(t?.faltantes ?? 0),
        sensiblesVacias: Boolean(t?.sensiblesVacias),
        detalle: rows.filter((r) => r.columna),
      }
    },
  })
}

export function useGenerarExterno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: GenerarExternoInput) => evalCol.postRow(`${BASE}/generar`, cuerpo(v)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: externosKeys.all }),
  })
}

/** Texto de una celda para CSV: entre comillas si lleva separador, comillas o saltos de línea. */
export function celdaCsv(v: unknown, sep: string): string {
  const s = v == null ? "" : String(v)
  return s.includes(sep) || s.includes('"') || /[\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Archivo de texto del contenido guardado: CSV con «;» o texto plano separado por tabuladores. */
export function archivoTexto(encabezados: string[], filas: unknown[][], formato: "CSV" | "TEXTO"): string {
  const sep = formato === "CSV" ? ";" : "\t"
  const linea = (xs: unknown[]) => xs.map((x) => celdaCsv(x, sep)).join(sep)
  return [linea(encabezados), ...filas.map(linea)].join("\r\n")
}

function guardar(nombre: string, texto: string) {
  // BOM: Excel abre el CSV en UTF-8 sin romper tildes ni la ñ.
  const url = URL.createObjectURL(new Blob(["﻿", texto], { type: "text/plain;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Descargar (C.4 Reportes externos): baja el archivo guardado tal cual, sin recalcularlo, en el formato
 * de su versión (nunca PDF), y deja la descarga en la Bitácora.
 */
export async function descargarGenerado(g: Generado): Promise<{ status: "ok" | "error"; message: string }> {
  const nombre = `${g.codigo.toLowerCase()}-${g.generadoId}`
  let resultado: { status: "ok" | "error"; message: string }
  const encabezados = g.encabezados ?? []
  try {
    if (g.formato === "EXCEL") {
      // Columnas fijas C01..C40 en reporting-service; los encabezados del archivo van por columnLabels.
      const claves = encabezados.map((_, i) => `c${String(i + 1).padStart(2, "0")}`)
      const r = await downloadReport("reporte-externo", {
        format: "excel",
        filters: { ID: g.generadoId },
        columns: claves,
        columnLabels: Object.fromEntries(claves.map((c, i) => [c, encabezados[i]])),
        nombreArchivo: nombre,
      })
      resultado = { status: r.status === "error" ? "error" : "ok", message: r.message }
    } else {
      const rows = camelizar<{ valores: unknown[] }[]>(await evalCol.getRows(`${BASE}/${g.generadoId}/contenido`))
      guardar(`${nombre}.${g.formato === "CSV" ? "csv" : "txt"}`, archivoTexto(encabezados, rows.map((r) => r.valores), g.formato))
      resultado = { status: "ok", message: `Se descargó el archivo (${rows.length} filas).` }
    }
  } catch {
    return { status: "error", message: "No se pudo descargar el archivo." }
  }
  if (resultado.status === "ok") {
    await api
      .post(`${AUDIT_API_PREFIX}/bitacora/exportaciones`, {
        MODULO: "COBERTURA",
        FORMATO: g.formato,
        FILTROS: JSON.stringify({ reporte: g.codigo, version: g.version, generado: g.generadoId, periodo: g.periodo, sede: g.sede }),
        FILAS: String(g.filas),
      })
      .catch(() => undefined)
  }
  return resultado
}
