import { http, HttpResponse, delay } from "msw"

import { planeadorDb } from "@/mocks/db/planeador"
import { evaluationPeriodsDb } from "@/mocks/db/academic-period/evaluation-periods"

/**
 * Mocks de `GET /planeador/docentes/grupos` y
 * `GET /planeador/docentes/grado-asignatura` (V242, ver colección Postman
 * `planeador-planilla`) — sin esto, con el mock activo, el "Filtro" de la
 * Planilla de calificación pega contra estas rutas, MSW no tiene handler,
 * la petición cae al backend real con el JWT falso del mock (`alg: none`) y
 * responde 401 — el interceptor global lo toma como sesión vencida y
 * redirige a /login en loop.
 *
 * Las combinaciones de grado/grupo/asignatura salen de las actividades
 * reales de `planeadorDb`, no de una lista fabricada aparte con su propio
 * esquema de nombres: la versión anterior generaba "Tercero"/"302" con un
 * hash determinístico, que nunca coincidía con el "3º"/"A" que de verdad
 * traen las actividades — el "Filtro" ofrecía combinaciones para las que la
 * grilla de la Planilla no encontraba nada, y quedaba siempre vacía. Derivar
 * acá mismo garantiza que toda combinación que aparece en el filtro tiene
 * al menos una actividad real detrás.
 */
export function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function nivelParaGrado(grado: string): { id: number; nombre: string } {
  const numero = Number(grado.match(/\d+/)?.[0] ?? NaN)
  if (Number.isNaN(numero)) return { id: 3, nombre: "Secundaria" }
  if (numero === 0) return { id: 1, nombre: "Preescolar" }
  if (numero <= 5) return { id: 2, nombre: "Primaria" }
  if (numero <= 9) return { id: 3, nombre: "Secundaria" }
  return { id: 4, nombre: "Media" }
}

export const planeadorDocentesHandlers = [
  http.get("/api/eval-col/planeador/docentes/grupos", async () => {
    await delay(200)
    const vistos = new Set<string>()
    const rows: {
      grupo_id: number
      grupo_codigo: string
      grupo_nombre: string
      grado_id: number
      grado_codigo: string
      grado_nombre: string
      nivel_ensenanza_id: number
      nivel_ensenanza_nombre: string
    }[] = []
    for (const actividad of planeadorDb) {
      const key = `${actividad.grado}|${actividad.grupo}`
      if (vistos.has(key)) continue
      vistos.add(key)
      const nivel = nivelParaGrado(actividad.grado)
      rows.push({
        grupo_id: hashString(`grupo-${key}`) % 1000000,
        grupo_codigo: actividad.grupo,
        grupo_nombre: `${actividad.grado}-${actividad.grupo}`,
        grado_id: hashString(`grado-${actividad.grado}`) % 1000000,
        grado_codigo: actividad.grado,
        grado_nombre: actividad.grado,
        nivel_ensenanza_id: nivel.id,
        nivel_ensenanza_nombre: nivel.nombre,
      })
    }
    return HttpResponse.json({ rows })
  }),

  http.get("/api/eval-col/planeador/docentes/grado-asignatura", async () => {
    await delay(200)
    const vistos = new Set<string>()
    const rows: {
      grado_id: number
      grado_codigo: string
      grado_nombre: string
      asignatura_id: number
      asignatura_codigo: string
      asignatura_nombre: string
    }[] = []
    for (const actividad of planeadorDb) {
      const key = `${actividad.grado}|${actividad.asignatura}`
      if (vistos.has(key)) continue
      vistos.add(key)
      rows.push({
        grado_id: hashString(`grado-${actividad.grado}`) % 1000000,
        grado_codigo: actividad.grado,
        grado_nombre: actividad.grado,
        asignatura_id: hashString(`asignatura-${actividad.asignatura}`) % 1000000,
        asignatura_codigo: actividad.asignatura.slice(0, 3).toUpperCase(),
        asignatura_nombre: actividad.asignatura,
      })
    }
    return HttpResponse.json({ rows })
  }),

  // `GET /planeador/periodos-evaluacion` — reemplaza a `POST
  // /periodo-evaluacion/query` como fuente del cuarto paso del filtro de la
  // Planilla: ese endpoint genérico responde 403 para `CEVAL-DOCENTE`
  // (confirmado en vivo), este es accesible al docente. Shape confirmado
  // contra la respuesta real — ya trae `vigente_hoy` calculado, así que acá
  // se deriva de las mismas fechas de `evaluationPeriodsDb` en vez de
  // hardcodear `true`.
  http.get("/api/eval-col/planeador/periodos-evaluacion", async () => {
    await delay(150)
    const hoy = new Date().toISOString().slice(0, 10)
    const rows = evaluationPeriodsDb.map((periodo) => ({
      pk_tperiodo_evaluacion: periodo.id,
      codigo: periodo.codigo,
      nombre: periodo.nombre,
      abreviacion: periodo.abreviacion,
      fecha_inicio: periodo.startDate,
      fecha_fin: periodo.endDate,
      porcentaje: periodo.peso,
      vigente_hoy: periodo.startDate <= hoy && hoy <= periodo.endDate,
      fk_tlv_estado: periodo.estadoId ?? 0,
      estado_valor: periodo.estado,
      estado_nombre: periodo.estadoName ?? "",
      fk_tperiodo_academico: periodo.academicPeriodId,
      periodo_academico: "",
    }))
    return HttpResponse.json({ rows })
  }),
]
