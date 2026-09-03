import { delay, http, HttpResponse } from "msw"

import {
  aplicarEdicionAsistencia,
  generarResumenHoras,
  generarRosterGrupo,
  generarSeguimiento,
  generarSesionesMes,
  marcarSesionRegistrada,
  TIPO_ASISTENCIA_NOMBRE,
} from "@/mocks/db/asistencia/asistencia"

import type {
  AsistenciaEditarRequest,
  AsistenciaQueryRequest,
  AsistenciaRegistrarRequest,
  ResumenHoras,
  SesionCalendario,
} from "@/features/academic-management/asistencia/api/types/asistencia"

export const asistenciaHandlers = [
  http.get("*/api/eval-col/asistencias/calendario", async ({ request }) => {
    await delay(200)

    const url = new URL(request.url)
    const sede = Number(url.searchParams.get("SEDE") ?? 0)
    const anio = Number(url.searchParams.get("ANIO") ?? new Date().getFullYear())
    const mes = Number(url.searchParams.get("MES") ?? new Date().getMonth() + 1)

    const rows: SesionCalendario[] = generarSesionesMes(sede, anio, mes)
    return HttpResponse.json(rows)
  }),

  http.get("*/api/eval-col/asistencias/resumen-horas", async ({ request }) => {
    await delay(200)

    const url = new URL(request.url)
    const sede = Number(url.searchParams.get("SEDE") ?? 0)
    const fechaParam = url.searchParams.get("FECHA")
    const fecha = fechaParam ? new Date(fechaParam) : new Date()

    const resumen: ResumenHoras = generarResumenHoras(sede, fecha)
    return HttpResponse.json(resumen)
  }),

  // Pantalla "Seguimiento" — sin SEDE en el contrato real (V221): el
  // alcance lo resuelve el backend por rol, no un filtro en el body. El
  // mock igual necesita saber cuál sede mostrar (para que coincida con la
  // que se estaba viendo en Asistencia), así que viaja como query string
  // (`?SEDE=`), no en el `FILTERS` del body -- mismo patrón que
  // `resumen-horas`/`calendario` arriba, y no contamina el contrato real.
  http.post("*/api/eval-col/asistencias/query", async ({ request }) => {
    await delay(250)

    const sede = Number(new URL(request.url).searchParams.get("SEDE") ?? 0)
    const { FILTERS, SORTING, PAGEINDEX, PAGESIZE } = (await request.json()) as AsistenciaQueryRequest

    const filtrados = generarSeguimiento(sede, FILTERS ?? {})

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

  // "Marcar todo como Asistió" (MARCAR_TODOS, sin REGISTROS) y "Asistencia
  // manual" (REGISTROS por estudiante) -- el mock no persiste TASISTENCIA
  // fila por fila, pero sí marca la sesión (grupo+asignatura+fecha+bloque)
  // como registrada, para que el próximo GET /calendario la devuelva en
  // REGISTRADA (ver `marcarSesionRegistrada`) y la celda del calendario
  // (y el toast/invalidate del front) reflejen que sí se tomó asistencia.
  http.post("*/api/eval-col/asistencias/registrar", async ({ request }) => {
    await delay(300)

    const body = (await request.json()) as AsistenciaRegistrarRequest
    const afectados = body.REGISTROS?.length ?? (body.MARCAR_TODOS != null ? 1 : 0)

    if (afectados > 0) {
      marcarSesionRegistrada(body.GRUPO, body.ASIGNATURA, body.FECHA, body.BLOQUE)
    }

    return HttpResponse.json(afectados)
  }),

  // MOCK-ONLY -- roster de un grupo para "Asistencia manual". No hay
  // endpoint real todavía (ver `generarRosterGrupo` en el db mock).
  http.get("*/api/eval-col/asistencias/roster", async ({ request }) => {
    await delay(200)

    const url = new URL(request.url)
    const grupo = Number(url.searchParams.get("GRUPO") ?? 0)

    return HttpResponse.json(generarRosterGrupo(grupo))
  }),

  // Editar un registro puntual desde "Seguimiento". Campos ausentes = no se
  // tocan; LIMPIAR_ARCHIVO/LIMPIAR_OBSERVACION son la única forma de
  // vaciarlos (mismo criterio que el backend real). Persiste vía
  // `aplicarEdicionAsistencia` para que el próximo /query lo refleje.
  http.patch("*/api/eval-col/asistencias/:id", async ({ request, params }) => {
    await delay(250)

    const pkTasistencia = Number(params.id)
    const body = (await request.json()) as AsistenciaEditarRequest

    aplicarEdicionAsistencia(pkTasistencia, {
      ...(body.TIPO_ASISTENCIA != null && {
        tipo_asistencia_valor: body.TIPO_ASISTENCIA,
        tipo_asistencia: TIPO_ASISTENCIA_NOMBRE[body.TIPO_ASISTENCIA],
      }),
      ...(body.LIMPIAR_OBSERVACION
        ? { observacion: null }
        : body.OBSERVACION != null && { observacion: body.OBSERVACION }),
      ...(body.LIMPIAR_ARCHIVO && { tiene_soporte: false, fk_soporte_archivo: null, soporte_nombre: null }),
    })

    return HttpResponse.json(pkTasistencia)
  }),
]
