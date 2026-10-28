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
        // Grados del nivel: el formulario del grado lista solo los de su nivel.
        grados: level.grados ?? [],
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
      SCALES: ScaleWriteItem[] | string
    }
    // El front manda SCALES como string JSON (`CAST(:BODY.SCALES AS JSONB)`).
    const scales: ScaleWriteItem[] =
      typeof body.SCALES === "string" ? JSON.parse(body.SCALES) : body.SCALES
    // Regla 51: nombre y abreviación únicos por nivel, y rangos sin cruces.
    for (const levelId of body.TEACHING_LEVEL_IDS) {
      const existing = ratingScalesDb.filter(
        (row) => row.academicPeriodId === body.ACADEMIC_PERIOD_ID && row.teachingLevelId === levelId
      )
      for (const scale of scales) {
        const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
        const dup = existing.find(
          (row) => same(row.nombre, scale.nombre) || same(row.abreviacion, scale.abreviacion)
        )
        if (dup) {
          const campo = same(dup.nombre, scale.nombre) ? "ese nombre" : "esa abreviación"
          return HttpResponse.json(
            { status: "error", message: `Ya existe una valoración con ${campo} en este nivel de enseñanza.` },
            { status: 409 }
          )
        }
        const cross = existing.find(
          (row) => scale.notaMinima <= row.notaMaxima && row.notaMinima <= scale.notaMaxima
        )
        if (cross) {
          const from = Math.max(scale.notaMinima, cross.notaMinima).toFixed(1).replace(".", ",")
          const to = Math.min(scale.notaMaxima, cross.notaMaxima).toFixed(1).replace(".", ",")
          return HttpResponse.json(
            {
              status: "error",
              message: `Las valoraciones ${scale.nombre} y ${cross.nombre} se cruzan entre ${from} y ${to}.`,
            },
            { status: 409 }
          )
        }
      }
    }
    let count = 0
    for (const levelId of body.TEACHING_LEVEL_IDS) {
      for (const scale of scales) {
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

  // Borrado en lote por nivel de enseñanza (`fn_escala_nivel_bulk_soft_delete`,
  // id_query 55, V82) — borra la escala completa (todas sus bandas) de cada
  // nivel seleccionado, no bandas sueltas.
  http.post("/api/eval-col/escalas/bulk-delete", async ({ request }) => {
    await delay(300)
    const { PERIODO_ACADEMICO_ID, IDS } = (await request.json()) as {
      PERIODO_ACADEMICO_ID: number
      IDS: number[]
    }
    const levels = new Set(IDS)
    for (let i = ratingScalesDb.length - 1; i >= 0; i--) {
      const row = ratingScalesDb[i]
      if (row.academicPeriodId === PERIODO_ACADEMICO_ID && levels.has(row.teachingLevelId)) {
        ratingScalesDb.splice(i, 1)
      }
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

  // Listado real (`fn_escala_listar`): POST con el período en el path, como lo
  // llama `use-rating-scales.ts`. Va al final para no tapar `/escalas/bulk-delete`.
  // Sin él la request salía al back real y el 401 cerraba la sesión.
  http.post("/api/eval-col/escalas/:academicPeriodId", async ({ params, request }) => {
    await delay(250)
    const academicPeriodId = Number(params.academicPeriodId)
    const body = (await request.json()) as { FILTRO: string | null; TEACHING_LEVEL_ID: number | null }
    const filtro = body.FILTRO?.toLowerCase()
    const scoped = ratingScalesDb
      .filter((row) => row.academicPeriodId === academicPeriodId)
      .filter((row) => body.TEACHING_LEVEL_ID == null || row.teachingLevelId === body.TEACHING_LEVEL_ID)
      .filter(
        (row) =>
          !filtro ||
          row.nombre.toLowerCase().includes(filtro) ||
          row.abreviacion.toLowerCase().includes(filtro)
      )
    const rows = scoped.map((row) => ({
      ...toRawRow(row),
      // Una TESCALA por período y nivel.
      escala_id: academicPeriodId * 1000 + row.teachingLevelId,
      total_count: scoped.length,
    }))
    return HttpResponse.json({ rows })
  }),
]
