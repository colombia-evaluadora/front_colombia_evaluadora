import { delay, http, HttpResponse } from "msw"

import {
  editarAsistencia,
  generarEstudiantesSesion,
  generarResumenHoras,
  generarSeguimiento,
  generarSesionesMes,
  listarSolicitudes,
  registrarArchivoSubido,
  registrarAsistenciaManual,
  resolverSolicitud,
  soloMisClases,
} from "@/mocks/db/asistencia/asistencia"

import type {
  AsistenciaEditarRequest,
  AsistenciaQueryRequest,
  AsistenciaRegistrarRequest,
  ResumenHoras,
  SesionCalendario,
} from "@/features/academic-management/asistencia/api/types/asistencia"

export const asistenciaHandlers = [
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
    const todas = generarSesionesMes(sede, anio, mes)
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

  http.get("*/api/eval-col/asistencias/resumen-horas", async ({ request }) => {
    await delay(200)

    const url = new URL(request.url)
    const sede = Number(url.searchParams.get("SEDE") ?? 0)
    const fechaParam = url.searchParams.get("FECHA")
    const fecha = fechaParam ? new Date(fechaParam) : new Date()

    const resumen: ResumenHoras = generarResumenHoras(sede, fecha, url.searchParams.get("MIAS") === "true")
    return HttpResponse.json(resumen)
  }),

  http.post("*/api/eval-col/asistencias/query", async ({ request }) => {
    await delay(250)

    const { FILTERS, SORTING, PAGEINDEX, PAGESIZE } = (await request.json()) as AsistenciaQueryRequest

    const filtrados = generarSeguimiento(FILTERS?.SEDE ?? 0, FILTERS ?? {})

    const sortId = SORTING?.ID
    const sorted = sortId
      ? [...filtrados].sort((a, b) => {
          const av = a[sortId as keyof typeof a]
          const bv = b[sortId as keyof typeof b]
          if (av === bv) return 0
          const cmp = (av ?? "") > (bv ?? "") ? 1 : -1
          return SORTING.DESC ? -cmp : cmp
        })
      : filtrados

    const pageSize = PAGESIZE > 0 ? PAGESIZE : 10
    const start = PAGEINDEX * pageSize
    const rows = sorted.slice(start, start + pageSize)

    return HttpResponse.json({ rows })
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
    return HttpResponse.json(listarSolicitudes(new URL(request.url).searchParams.get("tipo")))
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
      if (resolverSolicitud(id, aprobar)) resueltas.push(id)
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

