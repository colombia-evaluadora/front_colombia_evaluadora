import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX } from "@/lib/api-routes"
import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { downloadReport } from "@/lib/report-client"
import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"

// Hoja de apoyo C600 (C.4.EXT.5 a 7; Sección 3.9, Regla 70): estructura fija, sin versión. El
// formulario se diligencia en el aplicativo del DANE; esta hoja trae los valores para copiarlos allí.

const BASE = "/informes-reportes/c600"
const c600Keys = {
  all: [...informesKeys.all, "c600"] as const,
  generados: (body: unknown) => [...informesKeys.all, "c600", "generados", body] as const,
  contenido: (id: number) => [...informesKeys.all, "c600", "contenido", id] as const,
}

/** Valor de una pregunta que la plataforma no registra (sso fn_c600_contenido_interno). */
export const SIN_DATO = "Sin dato en la plataforma"

/** Módulos del libro (IV y V van en una sola hoja). */
export const MODULOS_C600 = [
  { hoja: 1, nombre: "I. Carátula" },
  { hoja: 2, nombre: "II. Organización institucional" },
  { hoja: 3, nombre: "III. Personal" },
  { hoja: 4, nombre: "IV y V. Matrícula y docentes por jornada" },
  { hoja: 6, nombre: "VI. Poblaciones especiales" },
  { hoja: 7, nombre: "VII. Situación académica" },
  { hoja: 8, nombre: "VIII. TIC" },
] as const

export interface HojaC600 {
  generadoId: number
  fecha: string
  usuario: string | null
  periodo: string
  alcance: string
}

export interface FilaC600 {
  hoja: number
  modulo: string
  numero: number
  pregunta: string
  sedeJornada: string
  valor: string
  fuente: string | null
}

export function useHojasC600Query(p: { pageIndex: number; pageSize: number }) {
  const body = { PAGEINDEX: p.pageIndex, PAGESIZE: p.pageSize }
  return useQuery({
    queryKey: c600Keys.generados(body),
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/generados/query`, body)
      return toPaginated(rows, { pageSize: p.pageSize, map: (r) => camelizar<HojaC600>(r) })
    },
    placeholderData: keepPreviousData,
  })
}

export function useContenidoC600Query(id: number) {
  return useQuery({
    queryKey: c600Keys.contenido(id),
    queryFn: async () => camelizar<FilaC600[]>(await evalCol.getRows(`${BASE}/${id}/contenido`)),
  })
}

export function useGenerarC600() {
  const queryClient = useQueryClient()
  return useMutation({
    /** Sedes por nombre; vacío = todas las del establecimiento. */
    mutationFn: (v: { periodo: number; sedes: string[] }) => evalCol.postRow(`${BASE}/generar`, { PERIODO: v.periodo, SEDES: v.sedes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: c600Keys.all }),
  })
}

/** Descargar: el libro de Excel de ocho hojas con lo guardado, sin recalcular; queda en la Bitácora. */
export async function descargarC600(h: HojaC600) {
  const r = await downloadReport("hoja-apoyo-c600", {
    format: "excel",
    filters: { ID: h.generadoId },
    nombreArchivo: `hoja-apoyo-c600-${h.generadoId}`,
  })
  if (r.status !== "error") {
    await api
      .post(`${AUDIT_API_PREFIX}/bitacora/exportaciones`, {
        MODULO: "COBERTURA",
        FORMATO: "EXCEL",
        FILTROS: JSON.stringify({ reporte: "hoja-apoyo-c600", generado: h.generadoId, periodo: h.periodo, alcance: h.alcance }),
        FILAS: String(r.filas ?? 0),
      })
      .catch(() => undefined)
  }
  return r
}
