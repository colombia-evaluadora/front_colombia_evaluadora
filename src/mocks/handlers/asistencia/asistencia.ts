import { delay, http, HttpResponse } from "msw"

import {
  editarAsistencia,
  generarAsistenciaPorGrupo,
  periodosEvaluacionGrupo,
  justificarAsistencia,
  generarEstudiantesSesion,
  generarResumenHoras,
  generarSesionesMes,
  listarSolicitudes,
  registrarArchivoSubido,
  registrarAsistenciaManual,
  resolverSolicitud,
  soloMisClases,
} from "@/mocks/db/asistencia/asistencia"
import { correccionesNotaPendientes, resolverCorreccionesNota } from "@/mocks/db/comunicaciones"
import {
  bloquesDelDia,
  calendarioDiario,
  cambiarModoAsistencia,
  esGrupoDiario,
  gruposDiarios,
  justificarDiaria,
  modoAsistenciaGrupo,
  planillaDiaria,
  porGrupoDiario,
  registrarDiaria,
  subirSoporteDiario,
} from "@/mocks/db/asistencia/asistencia-diaria"
import { usuarioDe } from "@/mocks/handlers/comunicaciones-elecciones"
import type { DiariaRegistrarRequest } from "@/features/academic-management/asistencia/api/types/asistencia-diaria"

// Registra la planilla diaria quien no es solo docente (Responsable de grupo, coordinación, administración).
function registraDiaria(request: Request): boolean {
  const roles = usuarioDe(request)?.roles ?? []
  return !(roles.includes("CEVAL-DOCENTE") && !roles.includes("CEVAL-DIRECTOR_GRUPO"))
}

const error22023 =(message: string, status = 400) => HttpResponse.json({ status: "error", message }, { status })

// Planilla diaria (sso V748). Van antes que /asistencias/:id y /grupos/:id.
const asistenciaDiariaHandlers = [
  http.post("*/api/files/eval-col/asistencias/soporte", async ({ request }) => {
    await delay(200)
    const archivo = (await request.formData()).get("SOPORTE")
    return HttpResponse.json({ rows: [{ pk_tarchivo: subirSoporteDiario(archivo instanceof File ? archivo.name : "soporte.pdf") }] })
  }),

  http.get("*/api/eval-col/asistencias/diaria/grupos", async ({ request }) => {
    await delay(120)
    return HttpResponse.json({ rows: gruposDiarios(registraDiaria(request)) })
  }),

  http.get("*/api/eval-col/asistencias/diaria/calendario", async ({ request }) => {
    await delay(150)
    // Como el back: solo los grupos donde el usuario registra la planilla.
    if (!registraDiaria(request)) return HttpResponse.json({ rows: [] })
    const url = new URL(request.url)
    const hoy = url.searchParams.get("HOY") ?? new Date().toISOString().slice(0, 10)
    return HttpResponse.json(calendarioDiario(Number(url.searchParams.get("ANIO")), Number(url.searchParams.get("MES")), hoy))
  }),

  http.get("*/api/eval-col/asistencias/diaria/planilla", async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const filas = planillaDiaria(Number(url.searchParams.get("GRUPO")), url.searchParams.get("FECHA") ?? "")
    return typeof filas === "string" ? error22023(filas) : HttpResponse.json({ rows: filas })
  }),

  http.get("*/api/eval-col/asistencias/diaria/bloques", async ({ request }) => {
    await delay(100)
    const url = new URL(request.url)
    return HttpResponse.json(bloquesDelDia(Number(url.searchParams.get("GRUPO")), url.searchParams.get("FECHA") ?? ""))
  }),

  http.post("*/api/eval-col/asistencias/diaria/registrar", async ({ request }) => {
    await delay(300)
    const r = registrarDiaria((await request.json()) as DiariaRegistrarRequest)
    // Como el back real: SELECT ... AS resultado, envuelto en rows.
    return "status" in r ? error22023(r.message, r.status) : HttpResponse.json({ rows: [{ resultado: r }] })
  }),

  http.patch("*/api/eval-col/asistencias/diaria/:id/justificar", async ({ request, params }) => {
    await delay(200)
    const fallo = justificarDiaria(Number(params.id), (await request.json()) as { JUSTIFICACION?: string; FUENTE?: number })
    if (fallo) return error22023(fallo.message, fallo.status)
    return HttpResponse.json({ rows: [{ pk_tasistencia_diaria: Number(params.id) }] })
  }),

  http.get("*/api/eval-col/asistencias/diaria/por-grupo", async ({ request }) => {
    await delay(250)
    const url = new URL(request.url)
    const filas = porGrupoDiario(Number(url.searchParams.get("GRUPO")), Number(url.searchParams.get("PERIODO")))
    return typeof filas === "string" ? error22023(filas) : HttpResponse.json({ rows: filas })
  }),

  // Faltaba en el mock: sin él la pestaña Asistencia por grupo caía en el proxy (401 y cierre de sesión).
  http.get("*/api/eval-col/asistencias/por-grupo/rotulo", async () => {
    await delay(100)
    return HttpResponse.json({ rows: [{ nombre_asignatura: "Asignatura" }] })
  }),

  http.get("*/api/eval-col/grupos/:id/modo-asistencia", async ({ params }) => {
    await delay(150)
    return HttpResponse.json({ rows: [modoAsistenciaGrupo(Number(params.id))] })
  }),

  http.patch("*/api/eval-col/grupos/:id/modo-asistencia", async ({ request, params }) => {
    await delay(200)
    const { MODO } = (await request.json()) as { MODO: string }
    const r = cambiarModoAsistencia(Number(params.id), MODO)
    return "status" in r ? error22023(r.message, r.status) : HttpResponse.json({ rows: [r] })
  }),
]

import type {
  AsistenciaEditarRequest,
  AsistenciaRegistrarRequest,
  ResumenHoras,
  SesionCalendario,
} from "@/features/academic-management/asistencia/api/types/asistencia"

export const asistenciaHandlers = [
  ...asistenciaDiariaHandlers,

  http.post("*/api/files/eval-col/tmp-icono-simbolo", async ({ request }) => {
    await delay(200)

    const form = await request.formData()
    const archivo = form.get("ICONO")
    const nombre = archivo instanceof File ? archivo.name : "soporte.pdf"

    return HttpResponse.json({ pk_tarchivo: registrarArchivoSubido(nombre) })
  }),

  http.get("*/api/eval-col/asistencias/calendario", async ({ request }) => {
    await delay(200)

    const url = new URL(request.url)
    const sede = Number(url.searchParams.get("SEDE") ?? 0)
    const anio = Number(url.searchParams.get("ANIO") ?? new Date().getFullYear())
    const mes = Number(url.searchParams.get("MES") ?? new Date().getMonth() + 1)

    const mias = url.searchParams.get("MIAS") === "true"
    // fn_asistencia_calendario deja fuera los grupos en modo Diaria (Regla 115).
    const todas = generarSesionesMes(sede, anio, mes).filter((s) => !esGrupoDiario(s.fk_grupo))
    const sesiones: SesionCalendario[] = mias ? soloMisClases(todas) : todas
    // El backend manda el NOMBRE en `grado`/`jornada` y el código en
    // `grado_valor`/`jornada_valor`; el front los reacomoda al normalizar.
    const rows = sesiones.map(({ grado, grado_nombre, jornada, jornada_nombre, ...sesion }) => ({
      ...sesion,
      grado: grado_nombre,
      grado_valor: grado,
      jornada: jornada_nombre,
      jornada_valor: jornada,
    }))
    return HttpResponse.json(rows)
  }),

  // Días inhábiles del mes (sso V542.1): un festivo el día 6 y una suspensión
  // el 20; las sesiones del mock no los excluyen.
  http.get("*/api/eval-col/asistencias/dias-inhabiles", async ({ request }) => {
    await delay(100)
    const url = new URL(request.url)
    const anio = Number(url.searchParams.get("ANIO") ?? new Date().getFullYear())
    const mes = String(Number(url.searchParams.get("MES") ?? new Date().getMonth() + 1)).padStart(2, "0")
    return HttpResponse.json([
      { fecha: `${anio}-${mes}-06`, fk_tperiodo_academico: 1, fk_tlv_jornada: 1, jornada: "Mañana", tipo: "FESTIVO", motivo: "Festivo nacional" },
      { fecha: `${anio}-${mes}-20`, fk_tperiodo_academico: 1, fk_tlv_jornada: 1, jornada: "Mañana", tipo: "SUSPENSION", motivo: "Jornada pedagógica" },
    ])
  }),

  // Antes que cualquier /asistencias/:id.
  http.get("*/api/eval-col/asistencias/por-grupo/periodos", async () => {
    await delay(150)
    return HttpResponse.json({ rows: periodosEvaluacionGrupo() })
  }),

  http.get("*/api/eval-col/asistencias/por-grupo", async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const asignatura = url.searchParams.get("ASIGNATURA")
    return HttpResponse.json({
      rows: generarAsistenciaPorGrupo(
        Number(url.searchParams.get("GRUPO")),
        Number(url.searchParams.get("PERIODO")),
        asignatura ? Number(asignatura) : null,
      ),
    })
  }),

  http.get("*/api/eval-col/asistencias/resumen-horas", async ({ request }) => {
    await delay(200)

    const url = new URL(request.url)
    const sede = Number(url.searchParams.get("SEDE") ?? 0)
    const fechaParam = url.searchParams.get("FECHA")
    const fecha = fechaParam ? new Date(fechaParam) : new Date()

    const resumen: ResumenHoras = generarResumenHoras(sede, fecha, url.searchParams.get("MIAS") === "true")
    return HttpResponse.json(resumen)
  }),

  http.post("*/api/eval-col/asistencias/registrar", async ({ request }) => {
    await delay(300)

    const body = (await request.json()) as AsistenciaRegistrarRequest
    const afectados = registrarAsistenciaManual(body)

    return HttpResponse.json(afectados)
  }),

 
  http.get("*/api/eval-col/asistencias/sesion/estudiantes", async ({ request }) => {
    await delay(200)

    const url = new URL(request.url)
    const grupo = Number(url.searchParams.get("GRUPO") ?? 0)
    const asignatura = Number(url.searchParams.get("ASIGNATURA") ?? 0)
    const fecha = url.searchParams.get("FECHA") ?? ""
    const bloqueParam = url.searchParams.get("BLOQUE")

    return HttpResponse.json(
      generarEstudiantesSesion({
        GRUPO: grupo,
        ASIGNATURA: asignatura,
        FECHA: fecha,
        ...(bloqueParam != null && { BLOQUE: Number(bloqueParam) }),
      }),
    )
  }),

  // Como el real (V438): delega en el PATCH por registro, pero solo devuelve
  // el conteo, sin `solicitudes_pendientes`. El front ya no lo usa.
  http.post("*/api/eval-col/asistencias/editar-masivo", async ({ request }) => {
    await delay(250)

    const { IDS = [], ...body } = (await request.json()) as AsistenciaEditarRequest & { IDS?: number[] }
    for (const pk of IDS) editarAsistencia(pk, body)
    return HttpResponse.json(IDS.length)
  }),

  // Antes que el PATCH /:id genérico: MSW usa el primer match.
  http.patch("*/api/eval-col/asistencias/:id/justificar", async ({ request, params }) => {
    await delay(200)

    const error = justificarAsistencia(
      Number(params.id),
      (await request.json()) as { JUSTIFICACION: string | null; FUENTE: number | null },
    )
    if (error) return HttpResponse.json({ status: "error", message: error.message }, { status: error.status })
    return HttpResponse.json({ rows: [{ fn_asistencia_justificar: Number(params.id) }] })
  }),

  // Regla 75: en período no calificable abre la solicitud en vez de editar.
  http.patch("*/api/eval-col/asistencias/:id", async ({ request, params }) => {
    await delay(250)

    const respuesta = editarAsistencia(Number(params.id), (await request.json()) as AsistenciaEditarRequest)
    if (!respuesta) {
      return HttpResponse.json(
        { status: "error", message: "El registro de asistencia no existe o no está activo." },
        { status: 404 },
      )
    }
    return HttpResponse.json(respuesta)
  }),

  http.get("*/api/eval-col/aprobaciones/pendientes", async ({ request }) => {
    await delay(200)
    const tipo = new URL(request.url).searchParams.get("tipo")
    if (tipo === "CORRECCION_RESULTADO") return HttpResponse.json([...correccionesNotaPendientes])
    return HttpResponse.json(listarSolicitudes(tipo))
  }),

  http.post("*/api/eval-col/aprobaciones/:accion", async ({ request, params }) => {
    await delay(300)
    const { IDS = [], MOTIVO } = ((await request.json().catch(() => ({}))) ?? {}) as { IDS?: number[]; MOTIVO?: string }
    const aprobar = params.accion === "aprobar-masivo"
    if (!aprobar && !MOTIVO?.trim()) {
      return HttpResponse.json({ status: "error", message: "Indique el motivo del rechazo" }, { status: 400 })
    }
    const resueltas: number[] = []
    const fallidas: { id: number; codigo: string; error: string }[] = []
    for (const id of IDS) {
      if (correccionesNotaPendientes.some((c) => c.pk_tsolicitud_aprobacion === id)) {
        resolverCorreccionesNota((c) => c.pk_tsolicitud_aprobacion === id)
        resueltas.push(id)
      } else if (resolverSolicitud(id, aprobar)) resueltas.push(id)
      else fallidas.push({ id, codigo: "22023", error: "La solicitud no existe o ya fue resuelta." })
    }
    return HttpResponse.json({ rows: [{ resultado: { resueltas, fallidas } }] })
  }),

  http.post("*/api/eval-col/aprobaciones/:id/:decision", async ({ request, params }) => {
    await delay(250)

    const { MOTIVO } = ((await request.json().catch(() => ({}))) ?? {}) as { MOTIVO?: string }
    const aprobar = params.decision === "aprobar"
    if (!aprobar && !MOTIVO?.trim()) {
      return HttpResponse.json(
        { status: "error", message: "Debe indicar el motivo del rechazo." },
        { status: 400 },
      )
    }
    const resultado = resolverSolicitud(Number(params.id), aprobar)
    if (!resultado) {
      return HttpResponse.json(
        { status: "error", message: "La solicitud no existe o ya fue resuelta." },
        { status: 404 },
      )
    }
    return HttpResponse.json(resultado)
  }),
]

