import { http, HttpResponse, delay } from "msw"

import {
  ratingScalesDb,
  teachingLevelsDb,
  nextRatingScaleId,
  type RatingScaleRow,
} from "@/mocks/db/academic-period/rating-scales"
import { ratingScaleTypesDb } from "@/mocks/db/academic-period/rating-scale-types"
import { ratingSymbolsDb } from "@/mocks/db/academic-period/rating-symbols"
import type { ExportFormat, ExportResult } from "@/features/establishment/academic-period/api/types/rating-scales"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

// Mismo pk sintético (índice + 1) que arma `select-catalog.ts` para
// TIPO_VALORACION/GRAFICA_CARITA/GRAFICA_SIMBOLO — necesario para resolver
// `tipoId`/`iconoId` de vuelta a valor/nombre al leer, igual que
// `fn_escala_listar` real resuelve por join contra TLISTA_VALOR.
function tipoLabel(tipoId: number | null): { valor: string; nombre: string } {
  const option = tipoId != null ? ratingScaleTypesDb[tipoId - 1] : undefined
  return { valor: option?.key ?? "", nombre: option?.label ?? "" }
}

function iconoValor(iconoId: number | null, iconoCategoria: RatingScaleRow["iconoCategoria"]): string {
  if (iconoId == null || iconoCategoria == null) return ""
  const categoria = iconoCategoria === "GRAFICA_CARITA" ? "carita" : "valoracion"
  const list = ratingSymbolsDb.filter((s) => s.categoria === categoria)
  return list[iconoId - 1]?.valor ?? ""
}

function toRawRow(row: RatingScaleRow) {
  const tipo = tipoLabel(row.tipoId)
  return {
    id: row.id,
    nombre: row.nombre,
    abreviacion: row.abreviacion,
    tipo: tipo.valor,
    tipo_name: tipo.nombre,
    iconografia: iconoValor(row.iconoId, row.iconoCategoria),
    teaching_level_id: row.teachingLevelId,
    nota_minima: row.notaMinima,
    nota_maxima: row.notaMaxima,
    nota_equivalente: row.notaEquivalente,
  }
}

interface ScaleWriteItem {
  nombre: string
  abreviacion: string
  tipoId: number | null
  iconoId: number | null
  iconoCategoria: RatingScaleRow["iconoCategoria"]
  notaMinima: number
  notaMaxima: number
  notaEquivalente: number
}

export const ratingScalesHandlers = [
  // `fn_nivel_ensenanza_listar` (id_query 67) — path real (ver
  // `use-teaching-levels.ts`), no el `/api/teaching-levels` viejo. Sin esto
  // básicamente cualquier pantalla del módulo (grados, grupos, escalas)
  // caía al mismo bug de logout que Criterio de promoción, porque todas
  // dependen de este catálogo.
  http.get("/api/eval-col/niveles-ensenanza", async () => {
    await delay(150)
    return HttpResponse.json({
      rows: teachingLevelsDb.map((level) => ({
        id: level.id,
        codigo: String(level.id),
        nombre: level.nombre,
      })),
    })
  }),

  // `fn_escala_listar` (id_query 52) — path/params reales (ver
  // `use-rating-scales.ts`), no el `/api/rating-scales/query` viejo.
  http.get("/api/eval-col/escalas", async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const periodoAcademicoId = Number(url.searchParams.get("periodoAcademicoId"))
    const filtro = url.searchParams.get("filtro")?.toLowerCase()

    let scoped = ratingScalesDb.filter((row) => row.academicPeriodId === periodoAcademicoId)
    if (filtro) {
      scoped = scoped.filter(
        (row) =>
          row.nombre.toLowerCase().includes(filtro) ||
          row.abreviacion.toLowerCase().includes(filtro)
      )
    }
    return HttpResponse.json({ rows: scoped.map(toRawRow) })
  }),

  // Alta en lote (`fn_escala_guardar_bulk`, id_query 53) — expande por nivel,
  // una fila nueva por (nivel × valoración), igual que el backend real.
  http.post("/api/eval-col/escalas", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as {
      ACADEMIC_PERIOD_ID: number
      TEACHING_LEVEL_IDS: number[]
      SCALES: ScaleWriteItem[]
    }
    let count = 0
    for (const levelId of body.TEACHING_LEVEL_IDS) {
      for (const scale of body.SCALES) {
        const id = nextRatingScaleId()
        ratingScalesDb.push({
          id,
          nombre: scale.nombre,
          abreviacion: scale.abreviacion,
          tipoId: scale.tipoId,
          iconoId: scale.iconoId,
          iconoCategoria: scale.iconoCategoria,
          teachingLevelId: levelId,
          notaMinima: scale.notaMinima,
          notaMaxima: scale.notaMaxima,
          notaEquivalente: scale.notaEquivalente,
          academicPeriodId: body.ACADEMIC_PERIOD_ID,
        })
        count++
      }
    }
    return HttpResponse.json({ rows: [{ fn_escala_guardar_bulk: count }] })
  }),

  // Baja lógica de una banda puntual (`fn_escala_eliminar`, id_query 54) —
  // también la usa `update-rating-scale.ts` (borra + recrea, no hay
  // `fn_escala_actualizar` real).
  http.put("/api/eval-col/escalas/:id", async ({ params }) => {
    await delay(300)
    const index = ratingScalesDb.findIndex((row) => String(row.id) === String(params.id))
    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Escala de valoración no encontrada." },
        { status: 404 }
      )
    }
    ratingScalesDb.splice(index, 1)
    return HttpResponse.json({ status: "ok", message: "Escala de valoración eliminada." })
  }),

  // Borrado en lote por ids (`fn_escala_bulk_delete`, id_query 55).
  http.post("/api/eval-col/escalas/bulk-delete", async ({ request }) => {
    await delay(300)
    const { IDS } = (await request.json()) as { IDS: number[] }
    const set = new Set(IDS)
    for (let i = ratingScalesDb.length - 1; i >= 0; i--) {
      if (set.has(ratingScalesDb[i].id)) ratingScalesDb.splice(i, 1)
    }
    return HttpResponse.json({ status: "ok", message: "Escalas eliminadas." })
  }),

  // Sin endpoint real en el contrato — exportar sigue siendo mock-only.
  http.post("/api/rating-scales/export", async ({ request }) => {
    await delay(600)
    const { ids, format } = (await request.json()) as {
      ids: number[]
      format: ExportFormat
    }
    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} escala(s) de valoración exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("/api/rating-scales/export-all", async () => {
    await delay(600)
    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ratingScalesDb.length} escala(s) de valoración exportada(s).`,
    })
  }),
]
