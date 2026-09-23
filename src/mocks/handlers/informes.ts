import { http, HttpResponse, delay } from "msw"

import { PERIODO_FINAL_ID } from "@/features/academic-management/reports/api/types"

import {
  ANIOS_INFORME,
  ASIGNATURAS_INFORME,
  ESTUDIANTES_INFORME,
  GRUPOS_INFORME,
  JORNADA_INFORME,
  PERIODOS_INFORME,
  SEDE_INFORME,
  consolidar,
  deleteObservacion,
  estaConsolidado,
  getEstadoObservacion,
  getEstadoObservacionAnio,
  getObservacion,
  getObservacionAnio,
  setEstadoObservacion,
  setEstadoObservacionAnio,
  setObservacionAnio,
  deleteObservacionAnio,
  historialInforme,
  notaDe,
  registrarHistorial,
  setObservacion,
  valoracionDe,
} from "@/mocks/db/informes"

/**
 * Mocks de `POST /informes/*` — las 14 rutas del módulo de Informes, que no
 * tenía ninguna. Todas son POST, incluidas las de lectura: cuatro reciben
 * arreglos y en este esquema ningún GET los acepta (ver `evalCol.postRows`).
 *
 * El sobre es `{rows: [...]}`, que es lo que `postRows` desenvuelve.
 */
const URL = (path: string) => `/api/eval-col/informes/${path}`

function grupoDe(grupoId: number) {
  return GRUPOS_INFORME.find((g) => g.grupoId === grupoId)
}

function estudiantesDe(grupoId: number) {
  return ESTUDIANTES_INFORME.filter((e) => e.grupoId === grupoId)
}

function asignaturasDe(grupoId: number) {
  return ASIGNATURAS_INFORME.filter((a) => a.grupoId === grupoId)
}

function periodoDe(periodoId: number) {
  return PERIODOS_INFORME.find((p) => p.id === periodoId)
}

function coincide(texto: string, search: string | null): boolean {
  if (!search?.trim()) return true
  return texto.toLowerCase().includes(search.trim().toLowerCase())
}

/** Filas de `/informes/grupo` para UN período. Preescolar sale siempre
 *  cualitativo: sin nota, con valoración + símbolo por dimensión. */
function filasDeGrupoPeriodo(grupoId: number, periodoId: number, search: string | null) {
  const grupo = grupoDe(grupoId)
  const periodo = periodoDe(periodoId)
  if (!grupo || !periodo) return []

  const consolidado = estaConsolidado(grupoId, periodoId)
  const asignaturas = asignaturasDe(grupoId)

  return estudiantesDe(grupoId)
    .filter((e) => coincide(`${e.nombre} ${e.documento}`, search))
    .map((estudiante, indice) => {
      const detalle = asignaturas.map((asignatura) => {
        if (grupo.cualitativo) {
          const { valoracion, simbolo } = valoracionDe(estudiante.matriculaId, asignatura.id)
          return {
            asignatura: asignatura.id,
            nombre: asignatura.nombre,
            abreviacion: asignatura.abreviacion,
            area: asignatura.area,
            orden: asignatura.orden,
            estado: consolidado ? "guardada" : "proyectada",
            es_numerico: false,
            nota: null,
            nota_propuesta: null,
            valoracion,
            simbolo,
            aprobada: true,
            ya_asegurado: false,
            alcanzable: true,
          }
        }

        const nota = notaDe(estudiante.matriculaId, asignatura.id)
        // Una sola asignatura con propuesta distinta, para que la demo muestre
        // el caso "cambio propuesto" (negro + gris) sin llenar la tabla de él.
        const propone = consolidado && asignatura.orden === 2
        return {
          asignatura: asignatura.id,
          nombre: asignatura.nombre,
          abreviacion: asignatura.abreviacion,
          area: asignatura.area,
          orden: asignatura.orden,
          estado: propone ? "cambio_propuesto" : consolidado ? "guardada" : "proyectada",
          es_numerico: true,
          nota,
          nota_propuesta: propone ? Math.min(5, Math.round((nota + 0.4) * 10) / 10) : null,
          valoracion: null,
          simbolo: null,
          aprobada: nota >= 3,
          ya_asegurado: false,
          alcanzable: true,
        }
      })

      const numericas = detalle.filter((d) => d.es_numerico && d.nota != null)
      const promedio = numericas.length
        ? Math.round((numericas.reduce((acc, d) => acc + (d.nota ?? 0), 0) / numericas.length) * 10) / 10
        : null

      return {
        fk_tmatricula: estudiante.matriculaId,
        estudiante: estudiante.nombre,
        documento: estudiante.documento,
        fk_tperiodo_evaluacion: periodoId,
        periodo_nombre: periodo.nombre,
        periodo_abreviacion: periodo.abreviacion,
        modo_periodo: "real",
        formato: grupo.cualitativo ? "cualitativo" : "numerico",
        es_cualitativo: grupo.cualitativo,
        consolidado,
        promedio_guardado: consolidado ? promedio : null,
        promedio_proyectado: promedio,
        puesto: grupo.cualitativo ? null : indice + 1,
        aprobadas: detalle.filter((d) => d.aprobada).length,
        reprobadas: detalle.filter((d) => d.aprobada === false).length,
        asignaturas: detalle,
        observacion: grupo.cualitativo ? getObservacion(estudiante.matriculaId, periodoId) : null,
        observacion_estado: grupo.cualitativo
          ? getEstadoObservacion(estudiante.matriculaId, periodoId)
          : null,
        observacion_desactualizada: false,
        tiene_cambios_propuestos: detalle.some((d) => d.estado === "cambio_propuesto"),
        // Solo preescolar adjunta imágenes a las observaciones.
        evidencias: grupo.cualitativo ? EVIDENCIAS_MOCK.length : 0,
      }
    })
}

/** La fila "Final", que se pide con PERIODO_FINAL_ID dentro del mismo
 *  arreglo de períodos: el promedio del AÑO, no el de los marcados, y un
 *  período sin nota guardada vale cero. Se calcula al vuelo igual que en el
 *  backend, y llega con `fk_tperiodo_evaluacion: -1` — un centinela, no un
 *  identificador. */
function filasFinalDeGrupo(grupoId: number, search: string | null) {
  const grupo = grupoDe(grupoId)
  if (!grupo) return []

  const asignaturas = asignaturasDe(grupoId)
  const totalPeriodos = PERIODOS_INFORME.length

  const filas = estudiantesDe(grupoId)
    .filter((e) => coincide(`${e.nombre} ${e.documento}`, search))
    .map((estudiante) => {
      // Preescolar no promedia observaciones: la fila existe, vacía.
      const detalle = grupo.cualitativo
        ? []
        : asignaturas.map((asignatura) => {
            const bruta = notaDe(estudiante.matriculaId, asignatura.id)
            const suma = PERIODOS_INFORME.reduce(
              (acc, periodo) => acc + (estaConsolidado(grupoId, periodo.id) ? bruta : 0),
              0,
            )
            const nota = Math.round((suma / totalPeriodos) * 10) / 10
            return {
              asignatura: asignatura.id,
              nombre: asignatura.nombre,
              abreviacion: asignatura.abreviacion,
              area: asignatura.area,
              orden: asignatura.orden,
              estado: "final",
              es_numerico: true,
              nota,
              nota_propuesta: null,
              valoracion: null,
              simbolo: null,
              aprobada: nota >= 3,
              ya_asegurado: false,
              alcanzable: true,
            }
          })

      const promedio = detalle.length
        ? Math.round((detalle.reduce((acc, d) => acc + d.nota, 0) / detalle.length) * 10) / 10
        : null

      return {
        fk_tmatricula: estudiante.matriculaId,
        estudiante: estudiante.nombre,
        documento: estudiante.documento,
        fk_tperiodo_evaluacion: -1,
        periodo_nombre: "Final",
        periodo_abreviacion: "FIN",
        modo_periodo: "final",
        formato: grupo.cualitativo ? "cualitativo" : "numerico",
        es_cualitativo: grupo.cualitativo,
        consolidado: false,
        promedio_guardado: promedio,
        promedio_proyectado: promedio,
        puesto: null as number | null,
        aprobadas: detalle.filter((d) => d.aprobada).length,
        reprobadas: detalle.filter((d) => !d.aprobada).length,
        asignaturas: detalle,
        // Lo GUARDADO, no el borrador: el concatenado es lo que devuelve
        // generar, y la fila arranca vacía hasta que alguien lo acepte.
        observacion: getObservacionAnio(estudiante.matriculaId),
        observacion_estado: getEstadoObservacionAnio(estudiante.matriculaId),
        observacion_desactualizada: false,
        tiene_cambios_propuestos: false,
        evidencias: grupo.cualitativo ? EVIDENCIAS_MOCK.length : 0,
      }
    })

  // El puesto se reparte sobre el promedio del Final, como en el backend.
  const orden = [...filas]
    .filter((f) => f.promedio_guardado != null)
    .sort((a, b) => (b.promedio_guardado ?? 0) - (a.promedio_guardado ?? 0))
  for (const fila of filas) {
    const i = orden.indexOf(fila)
    fila.puesto = i >= 0 ? i + 1 : null
  }
  return filas
}
/** Las evidencias que la demo adjunta a las observaciones de preescolar. Los
 *  `archivoId` no existen en el file-service simulado: `ArchivoImage` cae a su
 *  propio placeholder, que es justo lo que hace en producción con un archivo
 *  que ya no está. */
const EVIDENCIAS_MOCK = [
  { pk: 9001, archivo: 5001, nombre: "ronda-de-la-manana.jpg", actividad: "Ronda de la mañana" },
  { pk: 9002, archivo: 5002, nombre: "torre-de-bloques.jpg", actividad: "Torre de bloques" },
  { pk: 9003, archivo: 5003, nombre: "pintura-libre.jpg", actividad: "Pintura libre" },
]

/** La observación de la fila Final: los resúmenes YA consolidados de cada
 *  período, encadenados y prefijados con el nombre del período. No es lo mismo
 *  que `/informes/observacion/generar`, que concatena las observaciones por
 *  actividad dentro de un período. */
function observacionFinalDe(matriculaId: number): string | null {
  const partes = PERIODOS_INFORME.map((periodo) => {
    const texto = getObservacion(matriculaId, periodo.id)
    return texto ? `${periodo.nombre}: ${texto}` : null
  }).filter((parte): parte is string => parte !== null)
  return partes.length > 0 ? partes.join(" ") : null
}
export const informesHandlers = [
  // --- Cascada del filtro: sede -> año -> jornada/período académico --------
  http.post(URL("sedes"), async () => {
    await delay(120)
    return HttpResponse.json({ rows: [SEDE_INFORME] })
  }),

  http.post(URL("anos"), async () => {
    await delay(120)
    return HttpResponse.json({ rows: ANIOS_INFORME })
  }),

  http.post(URL("jornadas"), async () => {
    await delay(120)
    return HttpResponse.json({ rows: [JORNADA_INFORME] })
  }),

  http.post(URL("periodos"), async () => {
    await delay(120)
    const rows = PERIODOS_INFORME.map((p) => ({
      fk_tperiodo_evaluacion: p.id,
      codigo: p.abreviacion,
      nombre: p.nombre,
      abreviacion: p.abreviacion,
      fecha_inicio: p.fechaInicio,
      fecha_fin: p.fechaFin,
      porcentaje: 25,
      estado: "A",
      termino: p.termino,
      en_curso: p.enCurso,
      // Solo se puede calificar el que está en curso o ya terminó.
      calificable: p.termino || p.enCurso,
      fk_tperiodo_academico: JORNADA_INFORME.fk_tperiodo_academico,
      periodo_academico: JORNADA_INFORME.periodo_nombre,
      fk_tsede: SEDE_INFORME.fk_tsede,
      sede_nombre: SEDE_INFORME.sede_nombre,
      fk_tlv_jornada: JORNADA_INFORME.fk_tlv_jornada,
      jornada: JORNADA_INFORME.jornada_nombre,
      anio: 2026,
    }))
    return HttpResponse.json({ rows })
  }),

  http.post(URL("grupos-periodo"), async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as { SEARCH?: string | null }
    const rows = GRUPOS_INFORME.filter((g) => coincide(g.grupoEtiqueta, body.SEARCH ?? null)).map(
      (g) => ({
        grupo_id: g.grupoId,
        grupo_codigo: g.grupoCodigo,
        grupo_nombre: g.grupoNombre,
        grupo_etiqueta: g.grupoEtiqueta,
        capacidad: 30,
        estudiantes: estudiantesDe(g.grupoId).length,
        jornada_id: JORNADA_INFORME.fk_tlv_jornada,
        jornada_nombre: JORNADA_INFORME.jornada_nombre,
        grado_id: g.gradoId,
        grado_codigo: g.gradoCodigo,
        grado_nombre: g.gradoNombre,
        nivel_ensenanza_id: g.nivelId,
        nivel_ensenanza_nombre: g.nivelNombre,
        director_id: 700 + g.grupoId,
        director_nombre: g.director,
        fk_tperiodo_academico: JORNADA_INFORME.fk_tperiodo_academico,
      }),
    )
    return HttpResponse.json({ rows })
  }),

  // --- El informe del grupo: una fila por estudiante Y período ------------
  http.post(URL("grupo"), async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as {
      FK_TGRUPO: number
      PERIODOS: number[] | null
      SEARCH: string | null
    }
    const pedidos = body.PERIODOS?.length ? body.PERIODOS : [PERIODOS_INFORME[0].id]
    // Ordenados por período, no por el orden en que llegaron: `PERIODOS` viene
    // en el orden en que el usuario los fue tildando —y el que está en curso
    // viene preseleccionado—, así que sin esto el informe arrancaba por el
    // tercer período. La sub-fila de cada estudiante debe ir P1, P2, P3…
    const periodos = PERIODOS_INFORME.filter((p) => pedidos.includes(p.id)).map((p) => p.id)
    const rows = periodos.flatMap((periodoId) =>
      filasDeGrupoPeriodo(body.FK_TGRUPO, periodoId, body.SEARCH),
    )
    // El Final viaja como un id mas del arreglo: -1. Los periodos reales lo
    // ignoran solos, porque no matchea ninguno.
    if (pedidos.includes(PERIODO_FINAL_ID)) {
      rows.push(...filasFinalDeGrupo(body.FK_TGRUPO, body.SEARCH))
    }
    return HttpResponse.json({ rows })
  }),

  // --- Observación individual (preescolar) --------------------------------
  http.post(URL("observacion/guardar"), async ({ request }) => {
    await delay(180)
    const body = (await request.json()) as {
      FK_TMATRICULA: number
      FK_TPERIODO_EVALUACION: number
      OBSERVACION: string
      OBSERVACION_IA?: string
    }
    setObservacion(body.FK_TMATRICULA, body.FK_TPERIODO_EVALUACION, body.OBSERVACION)
    setEstadoObservacion(
      body.FK_TMATRICULA,
      body.FK_TPERIODO_EVALUACION,
      body.OBSERVACION_IA === body.OBSERVACION ? "APROBADA" : "MODIFICADA",
    )
    return HttpResponse.json({ rows: [{ status: "OK" }] })
  }),

  http.post(URL("observacion/eliminar"), async ({ request }) => {
    await delay(180)
    const body = (await request.json()) as {
      FK_TMATRICULA: number
      FK_TPERIODO_EVALUACION: number
    }
    // El real es borrado FÍSICO y llamarlo dos veces responde 404.
    if (getObservacion(body.FK_TMATRICULA, body.FK_TPERIODO_EVALUACION) === null) {
      return HttpResponse.json({ message: "No hay observación que eliminar." }, { status: 404 })
    }
    deleteObservacion(body.FK_TMATRICULA, body.FK_TPERIODO_EVALUACION)
    return HttpResponse.json({ rows: [{ status: "OK" }] })
  }),

  // --- Consolidar (gris -> negro) -----------------------------------------
  http.post(URL("guardar"), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as {
      FK_TGRUPO: number
      FK_TPERIODO_EVALUACION: number
      MATRICULAS: number[] | null
    }
    const periodo = periodoDe(body.FK_TPERIODO_EVALUACION)
    const yaEstaba = estaConsolidado(body.FK_TGRUPO, body.FK_TPERIODO_EVALUACION)
    const objetivo = estudiantesDe(body.FK_TGRUPO).filter(
      (e) => !body.MATRICULAS?.length || body.MATRICULAS.includes(e.matriculaId),
    )
    consolidar(body.FK_TGRUPO, body.FK_TPERIODO_EVALUACION)
    registrarHistorial({
      grupoId: body.FK_TGRUPO,
      asignaturaId: null,
      origen: "informe",
      periodoId: body.FK_TPERIODO_EVALUACION,
      usuario: "USUARIO DE PRUEBA",
      fecha: new Date().toISOString().slice(0, 10),
      momento: new Date().toISOString().slice(0, 19),
      estudiantes: objetivo.length,
    })

    const rows = objetivo.map((e) => {
      const asignaturas = asignaturasDe(body.FK_TGRUPO)
      const notas = asignaturas.map((a) => notaDe(e.matriculaId, a.id))
      const promedio = notas.length
        ? Math.round((notas.reduce((acc, n) => acc + n, 0) / notas.length) * 10) / 10
        : null
      return {
        fk_tmatricula: e.matriculaId,
        estudiante: e.nombre,
        resultado: yaEstaba ? "actualizada" : "guardada",
        anterior: null,
        nota_anterior: null,
        promedio,
        promedio_periodo: promedio,
        aprobadas: notas.filter((n) => n >= 3).length,
        reprobadas: notas.filter((n) => n < 3).length,
      }
    })
    return HttpResponse.json({
      rows,
      periodo: periodo?.nombre ?? null,
    })
  }),

  // --- Planilla de una asignatura -----------------------------------------
  http.post(URL("planilla"), async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as {
      FK_TGRUPO: number
      FK_TASIGNATURA: number
      FK_TPERIODO_EVALUACION: number
      SEARCH: string | null
    }
    const grupo = grupoDe(body.FK_TGRUPO)
    const consolidado = estaConsolidado(body.FK_TGRUPO, body.FK_TPERIODO_EVALUACION)

    const rows = estudiantesDe(body.FK_TGRUPO)
      .filter((e) => coincide(e.nombre, body.SEARCH))
      .map((e) => {
        const definitiva = notaDe(e.matriculaId, body.FK_TASIGNATURA)
        const actividades = [1, 2, 3].map((orden) => ({
          orden,
          pkTactividad: body.FK_TASIGNATURA * 10 + orden,
          titulo: `Actividad ${orden}`,
          pkTactividadEstudiante: e.matriculaId * 10 + orden,
          estado: orden === 3 ? "PENDIENTE" : "CALIFICADA",
          porcentaje: orden === 3 ? null : 60 + ((e.matriculaId + orden) % 40),
          nota: orden === 3 ? null : definitiva,
          valoracion: grupo?.cualitativo
            ? valoracionDe(e.matriculaId, body.FK_TASIGNATURA).valoracion
            : null,
          observacion: null,
          esEvaluativa: !grupo?.cualitativo,
          ponderacion: 33,
          notaMaxima: 5,
          instrumento: grupo?.cualitativo ? null : "RUBRICA",
          fechaInicio: "2026-07-06",
          fechaCierre: "2026-09-25",
        }))
        return {
          fk_tmatricula: e.matriculaId,
          fk_testudiante: e.estudianteId,
          estudiante: e.nombre,
          definitiva_guardada_homologada: consolidado ? definitiva : null,
          definitiva_proyectada_homologada: definitiva,
          actividades,
        }
      })
    return HttpResponse.json({ rows })
  }),

  http.post(URL("planilla/guardar"), async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as {
      FK_TGRUPO: number
      FK_TASIGNATURA: number
      FK_TPERIODO_EVALUACION: number
      MATRICULAS: number[] | null
    }
    const objetivo = estudiantesDe(body.FK_TGRUPO).filter(
      (e) => !body.MATRICULAS?.length || body.MATRICULAS.includes(e.matriculaId),
    )
    registrarHistorial({
      grupoId: body.FK_TGRUPO,
      asignaturaId: body.FK_TASIGNATURA,
      origen: "planilla",
      periodoId: body.FK_TPERIODO_EVALUACION,
      usuario: "USUARIO DE PRUEBA",
      fecha: new Date().toISOString().slice(0, 10),
      momento: new Date().toISOString().slice(0, 19),
      estudiantes: objetivo.length,
    })
    const rows = objetivo.map((e) => ({
      fk_tmatricula: e.matriculaId,
      estudiante: e.nombre,
      resultado: "guardada",
      anterior: null,
      nota_anterior: null,
      promedio: notaDe(e.matriculaId, body.FK_TASIGNATURA),
      promedio_periodo: null,
      aprobadas: null,
      reprobadas: null,
    }))
    return HttpResponse.json({ rows })
  }),

  // --- Historial y alertas -------------------------------------------------
  http.post(URL("historial"), async ({ request }) => {
    await delay(180)
    const body = (await request.json()) as {
      GRUPOS: number[] | null
      PERIODOS: number[] | null
      LIMITE: number | null
    }
    const rows = historialInforme
      .filter((h) => !body.GRUPOS?.length || body.GRUPOS.includes(h.grupoId))
      .filter((h) => !body.PERIODOS?.length || body.PERIODOS.includes(h.periodoId))
      .slice(0, body.LIMITE ?? 100)
      .map((h) => {
        const grupo = grupoDe(h.grupoId)
        const periodo = periodoDe(h.periodoId)
        const asignatura = ASIGNATURAS_INFORME.find((a) => a.id === h.asignaturaId)
        return {
          pk_tinforme_guardado: h.id,
          fecha: h.fecha,
          momento: h.momento,
          fk_tgrupo: h.grupoId,
          grupo_nombre: grupo?.grupoEtiqueta ?? null,
          fk_tasignatura: h.asignaturaId,
          asignatura_nombre: asignatura?.nombre ?? null,
          origen: h.origen,
          fk_tperiodo_evaluacion: h.periodoId,
          periodo_nombre: periodo?.nombre ?? null,
          periodo_abreviacion: periodo?.abreviacion ?? null,
          fk_tusuario: 1,
          guardado_por: h.usuario,
          estudiantes: h.estudiantes,
          detalle: estudiantesDe(h.grupoId)
            .slice(0, h.estudiantes)
            .map((e) => ({
              fk_tmatricula: e.matriculaId,
              estudiante: e.nombre,
              guardadas: 1,
              actualizadas: 0,
            })),
        }
      })
    return HttpResponse.json({ rows })
  }),

  // Planillas que el docente todavía no cerró. Ambas alertas son de 5°01: se
  // devuelven SOLO si ese grupo está entre los consultados, igual que el real
  // —que filtra por GRUPOS— y para que el informe de preescolar no muestre una
  // alerta que no le corresponde.
  http.post(URL("planillas-pendientes"), async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as { GRUPOS: number[] | null }
    if (!body.GRUPOS?.includes(502)) return HttpResponse.json({ rows: [] })
    const periodo = PERIODOS_INFORME[2]
    const rows = [
      {
        fk_tgrupo: 502,
        grupo_nombre: "5°01",
        fk_tasignatura: 4403,
        asignatura_nombre: "Ciencias naturales",
        fk_tperiodo_evaluacion: periodo.id,
        periodo_nombre: periodo.nombre,
        periodo_abreviacion: periodo.abreviacion,
        fk_tfuncionario: 702,
        docente: "JORGE ELIÉCER RAMOS",
        docentes_asignados: 1,
        actividades: 0,
        estudiantes_afectados: null,
      },
    ]
    return HttpResponse.json({ rows })
  }),

  // Notas que cambiaron después de consolidar. Solo aplica a 5°01, que es el
  // grupo con un período ya consolidado: sin consolidar no hay nada que
  // aprobar.
  http.post(URL("cambios-pendientes"), async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as { GRUPOS: number[] | null }
    if (!body.GRUPOS?.includes(502)) return HttpResponse.json({ rows: [] })
    const periodo = PERIODOS_INFORME[0]
    const rows = [
      {
        fk_tgrupo: 502,
        grupo_nombre: "5°01",
        fk_tasignatura: 4402,
        asignatura_nombre: "Lengua castellana",
        fk_tperiodo_evaluacion: periodo.id,
        periodo_nombre: periodo.nombre,
        periodo_abreviacion: periodo.abreviacion,
        fk_tfuncionario: 702,
        docente: "JORGE ELIÉCER RAMOS",
        docentes_asignados: 1,
        actividades: null,
        estudiantes_afectados: 6,
      },
    ]
    return HttpResponse.json({ rows })
  }),
  /** `POST /informes/evidencias`. Con FK_TPERIODO_EVALUACION nulo, las de todo
   *  el año — que es lo que pide la fila Final. */
  http.post(URL("evidencias"), async ({ request }) => {
    await delay(120)
    const body = (await request.json()) as {
      FK_TMATRICULA: number
      FK_TPERIODO_EVALUACION: number | null
    }
    const periodos = body.FK_TPERIODO_EVALUACION
      ? PERIODOS_INFORME.filter((p) => p.id === body.FK_TPERIODO_EVALUACION)
      : PERIODOS_INFORME
    const rows = periodos.flatMap((periodo) =>
      EVIDENCIAS_MOCK.map((evidencia) => ({
        pk_tactividad_soporte: evidencia.pk + periodo.id,
        fk_tarchivo: evidencia.archivo,
        nombre: evidencia.nombre,
        urls3: `actividad/${evidencia.archivo}.jpg`,
        peso: 180_000,
        etiqueta: null,
        fecha: null,
        fk_tperiodo_evaluacion: periodo.id,
        periodo_nombre: periodo.nombre,
        fk_tactividad: evidencia.pk,
        actividad_titulo: evidencia.actividad,
        observacion: null,
      })),
    )
    return HttpResponse.json({ rows })
  }),

  http.post(URL("observacion/final/guardar"), async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as {
      FK_TMATRICULA: number
      OBSERVACION: string
      OBSERVACION_IA?: string
    }
    setObservacionAnio(body.FK_TMATRICULA, body.OBSERVACION)
    setEstadoObservacionAnio(
      body.FK_TMATRICULA,
      body.OBSERVACION_IA === body.OBSERVACION ? "APROBADA" : "MODIFICADA",
    )
    return HttpResponse.json({ rows: [{ pk_testudiante_anio_observacion: body.FK_TMATRICULA }] })
  }),

  http.post(URL("observacion/final/eliminar"), async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as { FK_TMATRICULA: number }
    deleteObservacionAnio(body.FK_TMATRICULA)
    return HttpResponse.json({ rows: [{ pk_testudiante_anio_observacion: body.FK_TMATRICULA }] })
  }),

  // --- ai-control-service: resúmenes de observaciones con IA --------------
  // A diferencia de `/eval-col/informes/*`, este microservicio no envuelve
  // la respuesta en `{rows: [...]}` y el generar YA guarda: nace `APROBADA`
  // y responde 409 si lo que hay guardado es `MODIFICADA` y no llega
  // `SOBRESCRIBIR`. La demo no modela las observaciones por actividad del
  // docente (fuentes), así que el "resumen" es el texto ya sembrado —lo
  // mismo que hacía el borrador antes de tener IA real.
  http.post("/api/ai/observaciones/periodo", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as {
      FK_TMATRICULA: number
      FK_TPERIODO_EVALUACION: number
      SOBRESCRIBIR?: boolean
    }
    const estadoActual = getEstadoObservacion(body.FK_TMATRICULA, body.FK_TPERIODO_EVALUACION)
    if (estadoActual === "MODIFICADA" && !body.SOBRESCRIBIR) {
      return HttpResponse.json(
        { message: "La observación fue modificada por el docente." },
        { status: 409 },
      )
    }
    const observacion = getObservacion(body.FK_TMATRICULA, body.FK_TPERIODO_EVALUACION) ?? ""
    if (observacion) {
      setObservacion(body.FK_TMATRICULA, body.FK_TPERIODO_EVALUACION, observacion)
      setEstadoObservacion(body.FK_TMATRICULA, body.FK_TPERIODO_EVALUACION, "APROBADA")
    }
    return HttpResponse.json({
      observacion,
      origen: observacion ? 3 : 0,
      estado: "APROBADA",
      modelo: "mock-minimax-m3",
      tokensEntrada: 420,
      tokensSalida: 180,
      duracionMs: 900,
      desdeCache: false,
    })
  }),

  http.post("/api/ai/observaciones/anio", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as { FK_TMATRICULA: number; SOBRESCRIBIR?: boolean }
    const estadoActual = getEstadoObservacionAnio(body.FK_TMATRICULA)
    if (estadoActual === "MODIFICADA" && !body.SOBRESCRIBIR) {
      return HttpResponse.json(
        { message: "La observación fue modificada por el docente." },
        { status: 409 },
      )
    }
    const observacion = observacionFinalDe(body.FK_TMATRICULA) ?? ""
    if (observacion) {
      setObservacionAnio(body.FK_TMATRICULA, observacion)
      setEstadoObservacionAnio(body.FK_TMATRICULA, "APROBADA")
    }
    return HttpResponse.json({
      observacion,
      origen: observacion ? observacion.split(":").length - 1 : 0,
      estado: "APROBADA",
      modelo: "mock-minimax-m3",
      tokensEntrada: 600,
      tokensSalida: 260,
      duracionMs: 1100,
      desdeCache: false,
    })
  }),
]
