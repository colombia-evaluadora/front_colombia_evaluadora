import { http, HttpResponse, delay } from "msw"

import type { PlanillaAuxiliarGrupo } from "@/features/planeador/api/query/use-planillas-auxiliares-query"

/**
 * Mock de `GET /planeador/planillas-auxiliares/grupos` (sso V753,
 * `fn_planilla_auxiliar_grupos`): un grupo por clase con dos áreas, uno de
 * preescolar con rótulo «Dimensión» y uno en modo Diaria. El PDF lo atiende
 * `mocks/handlers/reportes.ts` (`planilla-auxiliar`).
 */
const PERIODOS: PlanillaAuxiliarGrupo["periodos"] = [
  { pk_tperiodo_evaluacion: 1, nombre: "Periodo 1", fecha_inicio: "2026-02-01", fecha_fin: "2026-04-16", en_curso: false },
  { pk_tperiodo_evaluacion: 2, nombre: "Periodo 2", fecha_inicio: "2026-04-17", fecha_fin: "2026-06-30", en_curso: false },
  { pk_tperiodo_evaluacion: 3, nombre: "Periodo 3", fecha_inicio: "2026-07-01", fecha_fin: "2026-09-13", en_curso: false },
  { pk_tperiodo_evaluacion: 4, nombre: "Periodo 4", fecha_inicio: "2026-09-14", fecha_fin: "2026-11-27", en_curso: true },
]

export const planillasAuxiliaresGruposDb: PlanillaAuxiliarGrupo[] = [
  {
    pk_tgrupo: 601,
    grado_grupo: "6°A",
    sede_nombre: "Sede principal",
    jornada: "Mañana",
    rotulo_area: "Área",
    modo_asistencia: "POR_CLASE",
    areas: [
      { pk_tasignatura: 11, nombre: "Matemáticas" },
      { pk_tasignatura: 12, nombre: "Ciencias naturales" },
    ],
    periodos: PERIODOS,
  },
  {
    pk_tgrupo: 1,
    grado_grupo: "Transición A",
    sede_nombre: "Sede principal",
    jornada: "Mañana",
    rotulo_area: "Dimensión",
    modo_asistencia: "POR_CLASE",
    areas: [{ pk_tasignatura: 21, nombre: "Dimensión comunicativa" }],
    periodos: PERIODOS,
  },
  {
    pk_tgrupo: 301,
    grado_grupo: "3°B",
    sede_nombre: "Sede principal",
    jornada: "Tarde",
    rotulo_area: "Área",
    modo_asistencia: "DIARIA",
    areas: [{ pk_tasignatura: 31, nombre: "Lenguaje" }],
    periodos: PERIODOS,
  },
]

export const planillasAuxiliaresHandlers = [
  http.get("*/eval-col/planeador/planillas-auxiliares/grupos", async () => {
    await delay(150)
    return HttpResponse.json({ rows: planillasAuxiliaresGruposDb })
  }),
]
