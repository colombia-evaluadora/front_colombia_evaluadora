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

/**
 * Filtro avanzado Sede → Año → Jornada → Docente del Planeador (sso V553 /
 * V553.1): `GET /planeador/filtros/sedes`, `/planeador/filtros/periodos?sede=`
 * y `GET /planeador/docentes?sede=&periodo=`. Datos fijos y chicos: alcanza
 * para recorrer la cascada con el mock (dos sedes, dos años, dos jornadas).
 */
const anioActual = new Date().getFullYear()
const hoyIso = new Date().toISOString().slice(0, 10)
const FILTRO_SEDES = [
  { fk_tsede: 101, sede_nombre: "Sede Principal", fk_testablecimiento: 1, establecimiento_nombre: "IE Demo" },
  { fk_tsede: 102, sede_nombre: "Sede Rural El Carmen", fk_testablecimiento: 1, establecimiento_nombre: "IE Demo" },
]
const FILTRO_JORNADAS = [
  { fk_tlv_jornada: 11, jornada_nombre: "Mañana" },
  { fk_tlv_jornada: 12, jornada_nombre: "Tarde" },
]
const FILTRO_DOCENTES = [
  { pk_tfuncionario: 501, nombre_completo: "Ana María Gómez", identificacion: "1012345678", sedes: [101] },
  { pk_tfuncionario: 502, nombre_completo: "Carlos Pérez Ruiz", identificacion: "79876543", sedes: [101, 102] },
  { pk_tfuncionario: 503, nombre_completo: "Lucía Torres", identificacion: "52111222", sedes: [102] },
]

function filtroPeriodos(sede: number) {
  return [anioActual, anioActual - 1].flatMap((anio, i) =>
    FILTRO_JORNADAS.map((j, k) => {
      const fechaInicio = `${anio}-01-20`
      const fechaFin = `${anio}-11-30`
      return {
        fk_tperiodo_academico: sede * 100 + i * 10 + k,
        periodo_nombre: String(anio),
        anio,
        fk_tlv_jornada: j.fk_tlv_jornada,
        jornada_nombre: j.jornada_nombre,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        en_curso: fechaInicio <= hoyIso && hoyIso <= fechaFin,
        abierto: fechaFin >= hoyIso,
      }
    }),
  )
}

export const planeadorDocentesHandlers = [
  http.get("/api/eval-col/planeador/filtros/sedes", async () => {
    await delay(150)
    return HttpResponse.json({ rows: FILTRO_SEDES })
  }),

  http.get("/api/eval-col/planeador/filtros/periodos", async ({ request }) => {
    await delay(150)
    const sede = Number(new URL(request.url).searchParams.get("sede"))
    return HttpResponse.json({ rows: FILTRO_SEDES.some((s) => s.fk_tsede === sede) ? filtroPeriodos(sede) : [] })
  }),

  http.get("/api/eval-col/planeador/docentes", async ({ request }) => {
    await delay(150)
    const sede = Number(new URL(request.url).searchParams.get("sede")) || undefined
    const rows = FILTRO_DOCENTES.filter((d) => sede == null || d.sedes.includes(sede)).map(
      ({ sedes: _sedes, ...row }) => row,
    )
    return HttpResponse.json({ rows })
  }),

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
