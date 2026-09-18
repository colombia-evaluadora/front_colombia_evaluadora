import { http, HttpResponse, delay } from "msw"

import { planeadorDb } from "@/mocks/db/planeador"
import { getCalificacionesByActividad } from "@/mocks/db/calificaciones"
import {
  asignaturaIdDe,
  calificacionANotas,
  decodePkTactividadEstudiante,
  esFormativaMock,
  getObservacion,
  getOverride,
  gradoIdDe,
  grupoIdDe,
  instrumentoActividadDe,
  mergeOverride,
  pkTactividadEstudianteDe,
  ponderacionItemCotejo,
  ponderacionNivelEscala,
  ponderacionNivelRubrica,
  setObservacion,
  setOverride,
  tipoInstrumentoDe,
} from "@/mocks/db/planilla"
import {
  itemsPonderables,
  notaDefinitiva,
  porcentajeFinal,
} from "@/features/planeador/api/types/calificacion"
import type { Actividad } from "@/features/planeador/api/types/actividad"

/**
 * Mocks del flujo real de la "Planilla de calificación" — confirmado contra
 * el backend real (ver `planeador-planilla-flujo-completo.postman_collection.json`).
 * Reemplaza el hack de derivar todo filtrando `Actividad[]` en el cliente:
 * acá cada handler calca el contrato de su endpoint real, apoyado en
 * `mocks/db/planilla.ts` para traducir entre el modelo de `Actividad` del
 * mock y ese contrato (instrumento de la actividad, no de la unidad).
 */
const PLANILLA_COLUMNAS_URL = "/api/eval-col/planeador/planilla/columnas"
const PLANILLA_CALIFICACIONES_URL = "/api/eval-col/planeador/planilla/calificaciones"
const INSTRUMENTO_URL = "/api/eval-col/planeador/actividades/:id/instrumento"
const CALIFICAR_CELDA_URL = "/api/eval-col/planeador/actividades/estudiantes/:id/calificar"
const CALIFICAR_BULK_URL = "/api/eval-col/planeador/actividades/:id/calificar-bulk/:tipo"
const NOTA_ESTUDIANTE_URL = "/api/eval-col/planeador/actividades/estudiantes/:id/nota"
const OBSERVAR_URL = "/api/eval-col/planeador/actividades/estudiantes/:id/observar"
const OBSERVAR_GRUPAL_URL = "/api/eval-col/planeador/actividades/:id/observar-grupal"

/** Actividades del (grado, grupo, asignatura) pedidos — mismos ids
 *  hasheados que ya devuelve `/planeador/docentes/grupos` y
 *  `/planeador/docentes/grado-asignatura` para ese mismo mock. */
function actividadesDelFiltro(url: URL): Actividad[] {
  const grupoId = Number(url.searchParams.get("grupo"))
  const asignaturaId = Number(url.searchParams.get("asignatura"))
  const gradoParam = url.searchParams.get("grado")
  const gradoId = gradoParam ? Number(gradoParam) : null
  return planeadorDb.filter(
    (a) =>
      grupoIdDe(a.grado, a.grupo) === grupoId &&
      asignaturaIdDe(a.asignatura) === asignaturaId &&
      (gradoId == null || gradoIdDe(a.grado) === gradoId),
  )
}

export const planeadorPlanillaHandlers = [
  // Columnas de la grilla: una fila por actividad del (grado, grupo,
  // asignatura) pedidos — 400 si falta grupo o asignatura, igual que el
  // motor real (`sqlState: "22023"`).
  http.get(PLANILLA_COLUMNAS_URL, async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    if (!url.searchParams.get("grupo") || !url.searchParams.get("asignatura")) {
      return HttpResponse.json(
        {
          error: "Debe seleccionar grupo y asignatura para consultar la planilla de calificacion",
          sqlState: "22023",
        },
        { status: 400 },
      )
    }
    const rows = actividadesDelFiltro(url).map((actividad, index) => {
      const tipo = tipoInstrumentoDe(actividad)
      return {
        orden_columna: index + 1,
        pk_tactividad: actividad.id,
        titulo: actividad.nombre,
        fk_tunidad: actividad.unidad.id || null,
        unidad: actividad.unidad.nombre || null,
        fk_tlv_instrumento_evaluacion: null,
        instrumento: tipo,
        instrumento_nombre: tipo ? actividad.instrumento : null,
        ponderacion: actividad.esEvaluativa ? actividad.ponderacion : null,
        nota_maxima: null,
        es_evaluativa: actividad.esEvaluativa ? "S" : "N",
        es_formativa: esFormativaMock(actividad) ? "S" : "N",
        metodo_valoracion: null,
        fecha_inicio: actividad.fechaInicio,
        fecha_cierre: actividad.fechaCierre,
        estudiantes_asignados: actividad.totalEstudiantes,
        estudiantes_calificados: actividad.evaluados,
      }
    })
    return HttpResponse.json({ rows })
  }),

  // Cuerpo de la grilla: una fila por estudiante (unión del roster de todas
  // las actividades filtradas) con sus celdas ya resueltas — el % de cada
  // celda sale de `porcentajeFinal`, igual que antes se calculaba en el
  // cliente, solo que ahora "del lado del servidor" (mock), con los
  // overrides de `calificar`/`calificar-bulk` ya aplicados encima.
  http.get(PLANILLA_CALIFICACIONES_URL, async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    if (!url.searchParams.get("grupo") || !url.searchParams.get("asignatura")) {
      return HttpResponse.json(
        {
          error: "Debe seleccionar grupo y asignatura para consultar la planilla de calificacion",
          sqlState: "22023",
        },
        { status: 400 },
      )
    }
    const actividades = actividadesDelFiltro(url)
    const porActividad = new Map(
      actividades.map((a) => [a.id, getCalificacionesByActividad(a.id, planeadorDb)]),
    )
    const roster = new Map<number, { id: number; nombres: string; apellidos: string }>()
    for (const lista of porActividad.values()) {
      for (const estudiante of lista) {
        if (!roster.has(estudiante.id)) roster.set(estudiante.id, estudiante)
      }
    }

    const rows = [...roster.values()].map((estudiante) => {
      const celdas = actividades.map((actividad, index) => {
        const base = porActividad.get(actividad.id)!.find((e) => e.id === estudiante.id)
        const noAsistio = base?.asistencia.estado === "no-asistio"
        const notas = getOverride(actividad.id, estudiante.id) ?? base?.notas ?? []
        const porcentaje = actividad.esEvaluativa
          ? porcentajeFinal(notas, itemsPonderables(actividad))
          : null
        return {
          ordenColumna: index + 1,
          pkTactividad: actividad.id,
          pkTunidad: actividad.unidad.id || null,
          pkTactividadEstudiante: pkTactividadEstudianteDe(actividad.id, estudiante.id),
          estado: noAsistio ? "NO_CALIFICABLE" : porcentaje === null ? "SIN_CALIFICAR" : "CALIFICADA",
          calificacion: porcentaje,
          recuperacion: null,
          definitiva: porcentaje,
          nota: porcentaje,
          calificable: noAsistio ? "N" : "S",
          observacion:
            getObservacion(actividad.id, estudiante.id) ??
            base?.asistencia.justificacion ??
            null,
          esFormativa: esFormativaMock(actividad),
          fechaAsistencia: actividad.fechaInicio.slice(0, 10),
          tieneAsistencia: !noAsistio,
          evidencias: [],
        }
      })

      const entradasDefinitiva = actividades.map((actividad) => ({
        actividad,
        notas:
          getOverride(actividad.id, estudiante.id) ??
          porActividad.get(actividad.id)!.find((e) => e.id === estudiante.id)?.notas ??
          [],
      }))

      return {
        pk_tmatricula: estudiante.id,
        pk_testudiante: estudiante.id,
        nombre_estudiante: `${estudiante.nombres} ${estudiante.apellidos}`,
        definitiva_proyectada: notaDefinitiva(entradasDefinitiva),
        definitiva_registrada: null,
        tendencia: null,
        celdas,
        total_count: roster.size,
      }
    })

    return HttpResponse.json({ rows })
  }),

  // Instrumento de UNA actividad puntual — 200 con `instrumento: null`
  // cuando todavía no tiene uno definido (no 404), igual que el real.
  http.get(INSTRUMENTO_URL, async ({ params }) => {
    await delay(120)
    const id = Number(params.id)
    const actividad = planeadorDb.find((a) => a.id === id)
    if (!actividad) {
      return HttpResponse.json({ message: "Actividad no encontrada." }, { status: 404 })
    }
    const instrumento = instrumentoActividadDe(actividad)
    return HttpResponse.json({
      rows: [
        {
          instrumento: instrumento.instrumento,
          instrumento_nombre: instrumento.instrumentoNombre,
          definicion: instrumento.definicion,
        },
      ],
    })
  }),

  // Definir/editar el instrumento: el mock no lo persiste de vuelta sobre
  // `planeadorDb` (el GET siempre deriva de lo que ya trae el seed) — solo
  // confirma la operación, que es lo único que consume el form de "Nueva
  // actividad" hoy.
  http.put(INSTRUMENTO_URL, async ({ params }) => {
    await delay(200)
    const id = Number(params.id)
    const actividad = planeadorDb.find((a) => a.id === id)
    if (!actividad) {
      return HttpResponse.json({ message: "Actividad no encontrada." }, { status: 404 })
    }
    return HttpResponse.json({ rows: [{ instrumento_aplicado: tipoInstrumentoDe(actividad) }] })
  }),

  // Calificar UNA celda: exige que el estudiante tenga asistencia
  // registrada para la actividad (mismo gate que el real) y guarda el set
  // COMPLETO de notas que mandó el popover (reemplaza, no mergea — el
  // popover ya adjunta todos los criterios que el docente llenó).
  http.put(CALIFICAR_CELDA_URL, async ({ params, request }) => {
    await delay(200)
    const pk = Number(params.id)
    const { actividadId, estudianteId } = decodePkTactividadEstudiante(pk)
    const actividad = planeadorDb.find((a) => a.id === actividadId)
    if (!actividad) {
      return HttpResponse.json({ message: "Actividad no encontrada." }, { status: 404 })
    }
    const body = (await request.json()) as { CALIFICACION: unknown; FECHA: string }
    const asistencia = getCalificacionesByActividad(actividadId, planeadorDb).find(
      (e) => e.id === estudianteId,
    )?.asistencia
    if (asistencia?.estado === "no-asistio") {
      return HttpResponse.json(
        {
          error: `No se puede calificar: no hay asistencia registrada para esta asignatura el ${body.FECHA}`,
          sqlState: "22023",
        },
        { status: 400 },
      )
    }
    // `CALIFICACION` viaja como STRING JSON serializado (bug de binder JSONB
    // del backend real, ver `use-calificar-celda.ts`) — se parsea acá antes
    // de traducirlo a `NotaCriterio[]`.
    const calificacion =
      typeof body.CALIFICACION === "string" ? JSON.parse(body.CALIFICACION) : body.CALIFICACION
    const notas = calificacionANotas(actividad, calificacion)
    setOverride(actividadId, estudianteId, notas)
    const porcentaje = porcentajeFinal(notas, itemsPonderables(actividad))
    return HttpResponse.json({ rows: [{ calificacion: porcentaje }] })
  }),

  // Calificar en bloque: UN criterio/ítem/nivel (según `:tipo`) aplicado a
  // varios estudiantes — cada uno se mergea sobre lo que ya tenía guardado,
  // no reemplaza el resto de criterios (mismo criterio que el real).
  http.put(CALIFICAR_BULK_URL, async ({ params, request }) => {
    await delay(250)
    const actividadId = Number(params.id)
    const tipo = params.tipo as "rubrica" | "cotejo" | "escala"
    const actividad = planeadorDb.find((a) => a.id === actividadId)
    if (!actividad) {
      return HttpResponse.json({ message: "Actividad no encontrada." }, { status: 404 })
    }
    const body = (await request.json()) as {
      ESTUDIANTES: number[]
      FECHA: string
      PK_CRITERIO?: number
      PK_NIVEL?: number
      PK_ITEM?: number
      CUMPLIDO?: "S" | "N"
    }
    const asistenciaPorEstudiante = new Map(
      getCalificacionesByActividad(actividadId, planeadorDb).map((e) => [e.id, e.asistencia]),
    )

    const rows = body.ESTUDIANTES.map((estudianteId) => {
      if (asistenciaPorEstudiante.get(estudianteId)?.estado === "no-asistio") {
        return {
          pk_tactividad_estudiante: estudianteId,
          error: `No se puede calificar: no hay asistencia registrada para esta asignatura el ${body.FECHA}`,
        }
      }
      if (tipo === "rubrica" && body.PK_CRITERIO != null && body.PK_NIVEL != null) {
        mergeOverride(actividadId, estudianteId, {
          criterioId: body.PK_CRITERIO,
          nivelId: body.PK_NIVEL,
          valor: ponderacionNivelRubrica(actividad, body.PK_CRITERIO, body.PK_NIVEL) ?? 100,
        })
      } else if (tipo === "cotejo" && body.PK_ITEM != null) {
        mergeOverride(actividadId, estudianteId, {
          criterioId: body.PK_ITEM,
          valor: ponderacionItemCotejo(actividad, body.PK_ITEM) ?? 100,
        })
      } else if (tipo === "escala" && body.PK_NIVEL != null) {
        mergeOverride(actividadId, estudianteId, {
          criterioId: 0,
          nivelId: body.PK_NIVEL,
          valor: ponderacionNivelEscala(actividad, body.PK_NIVEL) ?? 100,
        })
      }
      return { pk_tactividad_estudiante: estudianteId }
    })
    return HttpResponse.json({ rows })
  }),

  // Releer la nota de un estudiante después de guardar — `detalle` solo
  // está confirmado para RUBRICA contra el backend real, igual que en
  // `use-nota-estudiante-query.ts`.
  http.get(NOTA_ESTUDIANTE_URL, async ({ params }) => {
    await delay(120)
    const pk = Number(params.id)
    const { actividadId, estudianteId } = decodePkTactividadEstudiante(pk)
    const actividad = planeadorDb.find((a) => a.id === actividadId)
    if (!actividad) {
      return HttpResponse.json({ message: "Actividad no encontrada." }, { status: 404 })
    }
    const base = getCalificacionesByActividad(actividadId, planeadorDb).find(
      (e) => e.id === estudianteId,
    )
    const notas = getOverride(actividadId, estudianteId) ?? base?.notas ?? []
    const tipo = tipoInstrumentoDe(actividad)
    const porcentaje = actividad.esEvaluativa ? porcentajeFinal(notas, itemsPonderables(actividad)) : null
    const detalle =
      tipo === "RUBRICA"
        ? notas
            .filter((n) => n.nivelId != null)
            .map((n) => ({ pkCriterio: n.criterioId, pkNivel: n.nivelId, ponderacion: n.valor }))
        : null
    return HttpResponse.json({
      rows: [
        {
          instrumento: tipo,
          calificacion: porcentaje,
          calificable: base?.asistencia.estado === "no-asistio" ? "N" : "S",
          observacion:
            getObservacion(actividadId, estudianteId) ??
            base?.asistencia.justificacion ??
            null,
          detalle,
          evidencias: [],
        },
      ],
    })
  }),

  // Observar a UN estudiante (actividad formativa): mismo gate de asistencia
  // que calificar, y la observación pisa a la que hubiera (grupal incluida).
  http.put(OBSERVAR_URL, async ({ params, request }) => {
    await delay(200)
    const pk = Number(params.id)
    const { actividadId, estudianteId } = decodePkTactividadEstudiante(pk)
    const actividad = planeadorDb.find((a) => a.id === actividadId)
    if (!actividad) {
      return HttpResponse.json({ message: "Actividad no encontrada." }, { status: 404 })
    }
    const body = (await request.json()) as { OBSERVACION: string; FECHA: string }
    const asistencia = getCalificacionesByActividad(actividadId, planeadorDb).find(
      (e) => e.id === estudianteId,
    )?.asistencia
    if (asistencia?.estado === "no-asistio") {
      return HttpResponse.json(
        {
          error: `No se puede observar: no hay asistencia registrada para esta asignatura el ${body.FECHA}`,
          sqlState: "22023",
        },
        { status: 400 },
      )
    }
    setObservacion(actividadId, estudianteId, body.OBSERVACION)
    return HttpResponse.json({ rows: [{ status: "OK" }] })
  }),

  // Observación grupal: se aplica a todo el roster y OMITE (no falla) a quien
  // no tenga asistencia válida — devuelve cuántos quedaron observados.
  http.post(OBSERVAR_GRUPAL_URL, async ({ params, request }) => {
    await delay(250)
    const actividadId = Number(params.id)
    const actividad = planeadorDb.find((a) => a.id === actividadId)
    if (!actividad) {
      return HttpResponse.json({ message: "Actividad no encontrada." }, { status: 404 })
    }
    const body = (await request.json()) as { OBSERVACION: string; FECHA: string }
    const observados = getCalificacionesByActividad(actividadId, planeadorDb).filter(
      (estudiante) => {
        if (estudiante.asistencia.estado === "no-asistio") return false
        setObservacion(actividadId, estudiante.id, body.OBSERVACION)
        return true
      },
    ).length
    return HttpResponse.json({ rows: [{ estudiantes_observados: observados }] })
  }),
]
