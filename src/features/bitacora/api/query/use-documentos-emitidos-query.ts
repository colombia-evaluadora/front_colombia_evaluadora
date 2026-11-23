import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { endOfDay, startOfDay } from "date-fns"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX } from "@/lib/api-routes"
import { parseDateValue } from "@/lib/date-value"
import { toPageCount } from "@/lib/pagination"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"

import { DOCUMENTOS_MOCK } from "@/features/bitacora/api/mock-documentos"
import { bitacoraKeys } from "@/features/bitacora/api/query-keys"
import type {
  DocumentoEmitido,
  DocumentosFiltros,
  DocumentosPagina,
} from "@/features/bitacora/api/types/documentos"

export interface DocumentosParams {
  filters: DocumentosFiltros
  /** Solo lo elige el Superadministrador; a los demás el back los fija en el suyo. */
  establecimiento: string
  pageIndex: number
  pageSize: number
}

/** Fila de `POST /audit-cval/bitacora/documentos/query` (pendiente de backend). */
interface DocumentoRow extends DocumentoEmitido {
  total_count: number | string
}

async function fetchDocumentos(params: DocumentosParams): Promise<DocumentosPagina> {
  if (env.ENABLE_API_MOCKING) return documentosMock(params)
  const { filters: f } = params
  const response = await api.query<RowsEnvelope<DocumentoRow>>(`${AUDIT_API_PREFIX}/bitacora/documentos/query`, {
    filters: {
      FK_ESTABLECIMIENTO: params.establecimiento || undefined,
      BUSQUEDA: f.q.trim() || undefined,
      TIPO: f.tipo || undefined,
      ESTADO: f.estado || undefined,
      DESDE: f.desde,
      HASTA: f.hasta,
    },
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  })
  const rows = unwrapRows(response)
  const totalCount = Number(rows[0]?.total_count ?? 0)
  return { rows, totalCount, pageCount: toPageCount(totalCount, params.pageSize) }
}

/** B.8.LIS.1: documentos emitidos con código QR, su estado y cuántas veces se verificaron. */
export function useDocumentosEmitidosQuery(params: DocumentosParams, enabled = true) {
  return useQuery({
    queryKey: bitacoraKeys.documentos(params),
    queryFn: () => fetchDocumentos(params),
    placeholderData: keepPreviousData,
    // Sin servicio en el backend todavía: con mocks apagados (test/prod) no se consulta, para no
    // pedir un endpoint inexistente. La pantalla muestra el aviso de «Vista previa».
    enabled: enabled && env.ENABLE_API_MOCKING,
  })
}

// --- Mock -----------------------------------------------------------------

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

async function documentosMock({ filters: f, pageIndex, pageSize }: DocumentosParams): Promise<DocumentosPagina> {
  await new Promise((r) => setTimeout(r, 250))
  const q = normalizar(f.q.trim())
  const desde = parseDateValue(f.desde)
  const hasta = parseDateValue(f.hasta)
  const filtrados = DOCUMENTOS_MOCK.filter((d) => {
    const generado = new Date(d.generadoEn)
    return (
      (!q || normalizar(`${d.codigo} ${d.estudiante} ${d.documentoEstudiante}`).includes(q)) &&
      (!f.tipo || d.tipo === f.tipo) &&
      (!f.estado || d.estado === f.estado) &&
      (!desde || generado >= startOfDay(desde)) &&
      (!hasta || generado <= endOfDay(hasta))
    )
  }).sort((a, b) => b.generadoEn.localeCompare(a.generadoEn))
  return {
    rows: filtrados.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    totalCount: filtrados.length,
    pageCount: toPageCount(filtrados.length, pageSize),
  }
}
