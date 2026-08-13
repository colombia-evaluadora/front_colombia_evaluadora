import { http, HttpResponse, delay } from "msw"

import { jornadasDb } from "../../db/academic-period/jornadas"
import { academicPeriodStatusesDb } from "../../db/academic-period/academic-period-statuses"
import { evaluationPeriodStatusesDb } from "../../db/academic-period/evaluation-period-statuses"

// Mismo shape crudo que el catálogo genérico real
// (`GET /eval-col/select/:CATEGORIA`): `{rows: [{pk_lista_valor, nombre, valor, accion}]}`.
interface SelectCategoryRow {
  pk_lista_valor: number
  nombre: string
  valor: string
  accion: string | null
}

const CATALOGS_BY_CATEGORIA: Record<string, () => SelectCategoryRow[]> = {
  JORNADA: () =>
    jornadasDb.map((jornada) => ({
      pk_lista_valor: jornada.id,
      nombre: jornada.name,
      valor: jornada.name,
      accion: null,
    })),
  ESTADOPERIODO: () =>
    academicPeriodStatusesDb.map((status) => ({
      pk_lista_valor: status.id,
      nombre: status.label,
      valor: status.key,
      accion: null,
    })),
  ESTADOPERIODOEVALUACION: () =>
    evaluationPeriodStatusesDb.map((status) => ({
      pk_lista_valor: status.id,
      nombre: status.label,
      valor: status.key,
      accion: null,
    })),
}

export const selectCatalogHandlers = [
  http.get("/api/eval-col/select/:categoria", async ({ params }) => {
    await delay(150)
    const categoria = String(params.categoria).toUpperCase()
    const rows = CATALOGS_BY_CATEGORIA[categoria]?.() ?? []
    return HttpResponse.json({ rows })
  }),
]
