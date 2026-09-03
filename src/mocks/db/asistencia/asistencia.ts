import type {
  AsistenciaQueryFilters,
  AsistenciaQueryRow,
  EstadoSesion,
  ResumenHoras,
  SesionCalendario,
  TipoAsistencia,
} from "@/features/academic-management/asistencia/api/types/asistencia"
import { gradoDeGrupo } from "@/features/academic-management/asistencia/api/ui-mappings"

const GRUPOS = [
  { fk_grupo: 601, grupo: "601", jornada: "C" },
  { fk_grupo: 602, grupo: "602", jornada: "T" },
  { fk_grupo: 701, grupo: "701", jornada: "C" },
  { fk_grupo: 801, grupo: "801", jornada: "T" },
]

const ASIGNATURAS = [
  { fk_asignatura: 1, asignatura: "Cognitiva" },
  { fk_asignatura: 2, asignatura: "Matemáticas" },
  { fk_asignatura: 3, asignatura: "Lenguaje" },
]

const HORAS_BLOQUE = 1.5

function estadoDeSesion(fecha: Date, hoy: Date): EstadoSesion {
  if (fecha > hoy) return "PENDIENTE"
  const day = fecha.getDate()
  return day % 6 === 0 ? "RETRASADA" : "REGISTRADA"
}

function claveSesion(fkGrupo: number, fkAsignatura: number, fecha: string, bloque: number): string {
  return `${fkGrupo}-${fkAsignatura}-${fecha}-${bloque}`
}

const sesionesRegistradas = new Set<string>()

export function marcarSesionRegistrada(
  fkGrupo: number,
  fkAsignatura: number,
  fecha: string,
  bloque: number,
): void {
  sesionesRegistradas.add(claveSesion(fkGrupo, fkAsignatura, fecha, bloque))
}

const HORA_INICIO_JORNADA = 7 // 07:00, arranca la jornada

function horaBloque(fechaIso: string, bloque: number, offsetHoras: number): string {
  const horas = HORA_INICIO_JORNADA + (bloque - 1) * HORAS_BLOQUE + offsetHoras
  const hh = String(Math.floor(horas)).padStart(2, "0")
  const mm = String(Math.round((horas % 1) * 60)).padStart(2, "0")
  return `${fechaIso}T${hh}:${mm}:00`
}

/** Sesiones de un mes completo para una sede: lunes a viernes, TODOS los grupos con 2-4 bloques cada uno. */
export function generarSesionesMes(sedeId: number, anio: number, mes: number): SesionCalendario[] {
  const hoy = new Date()
  const sesiones: SesionCalendario[] = []
  const diasEnMes = new Date(anio, mes, 0).getDate()

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fecha = new Date(anio, mes - 1, dia)
    const diaSemana = fecha.getDay()
    if (diaSemana === 0 || diaSemana === 6) continue
    for (const grupo of GRUPOS) {
      const bloques = 2 + ((dia + grupo.fk_grupo) % 3) // 2 a 4 bloques

      for (let bloque = 1; bloque <= bloques; bloque++) {
        const asignatura = ASIGNATURAS[(dia + grupo.fk_grupo + bloque) % ASIGNATURAS.length]
        const totalEstudiantes = 25 + ((dia + grupo.fk_grupo + sedeId) % 6)
        const ausentes = (dia + bloque) % 5
        const tarde = (dia + bloque) % 3
        const aTiempo = Math.max(0, totalEstudiantes - ausentes - tarde)

        const fechaIso = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
        const registrada = sesionesRegistradas.has(
          claveSesion(grupo.fk_grupo, asignatura.fk_asignatura, fechaIso, bloque),
        )
        sesiones.push({
          fecha: fechaIso,
          bloque,
          fk_grupo: grupo.fk_grupo,
          grupo: grupo.grupo,
          jornada: grupo.jornada,
          fk_asignatura: asignatura.fk_asignatura,
          asignatura: asignatura.asignatura,
          hora_inicio: horaBloque(fechaIso, bloque, 0),
          hora_fin: horaBloque(fechaIso, bloque, HORAS_BLOQUE),
          estado_sesion: registrada ? "REGISTRADA" : estadoDeSesion(fecha, hoy),
          total_estudiantes: totalEstudiantes,
          a_tiempo: aTiempo,
          tarde,
          ausentes,
          horas: HORAS_BLOQUE,
        })
      }
    }
  }

  return sesiones
}

/** Resumen de horas para las tarjetas del encabezado, a partir de las mismas sesiones generadas. */
export function generarResumenHoras(sedeId: number, fecha: Date): ResumenHoras {
  const anio = fecha.getFullYear()
  const mes = fecha.getMonth() + 1
  const sesionesMes = generarSesionesMes(sedeId, anio, mes)
  const registradas = sesionesMes.filter((s) => s.estado_sesion === "REGISTRADA")

  const startOfWeek = new Date(fecha)
  startOfWeek.setDate(fecha.getDate() - fecha.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  const sesionesSemana = registradas.filter((s) => {
    const d = new Date(s.fecha)
    return d >= startOfWeek && d <= endOfWeek
  })

  const horasSemana = sesionesSemana.reduce((sum, s) => sum + s.horas, 0)
  const horasMes = registradas.reduce((sum, s) => sum + s.horas, 0)
  const horasAnio = horasMes * 9.5 // aproximación estable para el mock, sin recorrer 12 meses

  const horasEfectivasMes = registradas.reduce((sum, s) => {
    const presentes = s.a_tiempo + s.tarde
    const fraccion = s.total_estudiantes > 0 ? presentes / s.total_estudiantes : 0
    return sum + s.horas * fraccion
  }, 0)

  return {
    horas_semana: Math.round(horasSemana * 10) / 10,
    horas_mes: Math.round(horasMes * 10) / 10,
    horas_anio: Math.round(horasAnio * 10) / 10,
    horas_efectivas_mes: Math.round(horasEfectivasMes * 10) / 10,
    registradas_mes: sesionesMes.filter((s) => s.estado_sesion === "REGISTRADA").length,
    retrasadas_mes: sesionesMes.filter((s) => s.estado_sesion === "RETRASADA").length,
    pendientes_mes: sesionesMes.filter((s) => s.estado_sesion === "PENDIENTE").length,
  }
}

// ── Seguimiento (POST /eval-col/asistencias/query) ─────────────────────────

const ESTUDIANTES = [
  { nombre: "Sebastián David Jaramillo Gómez", documento: "1004829371" },
  { nombre: "Valentina Sofía Torres Martínez", documento: "1002937461" },
  { nombre: "Juan Esteban Pérez Morales", documento: "1007284915" },
  { nombre: "Mariana Alejandra Castillo Ríos", documento: "1001938274" },
  { nombre: "Samuel Nicolás Patiño Gómez", documento: "1009182736" },
  { nombre: "Isabella María Rodríguez Cuello", documento: "1003847291" },
  { nombre: "Santiago Andrés Barros Iguarán", documento: "1006192837" },
  { nombre: "Camila Andrea Villalobos Meza", documento: "1002019384" },
  { nombre: "Emmanuel José Contreras Ariza", documento: "1008374651" },
  { nombre: "Luciana Paola Herrera Salcedo", documento: "1005647382" },
  { nombre: "Matías Alejandro Nieves Escobar", documento: "1001827364" },
  { nombre: "Antonella Sofía Palencia Redondo", documento: "1007465821" },
] as const

// VALOR de TLISTA_VALOR CATEGORIA='TIPO_ASISTENCIA' (V220): 1 Asistió, 2 NO
// asistió, 3 NO asistió (justificado), 5 Llegó tarde, 6 Llegó tarde
// (justificado) -- no existe el 4.
export const TIPO_ASISTENCIA_NOMBRE: Record<TipoAsistencia, string> = {
  1: "Asistió",
  2: "No asistió",
  3: "No asistió",
  5: "Llegó tarde",
  6: "Llegó tarde",
}

const OBSERVACIONES: Partial<Record<TipoAsistencia, string[]>> = {
  3: ["Partido de fútbol", "Cita médica", "Viaje familiar"],
  6: ["Cita médica", "Trancón en la vía"],
}

const ARCHIVOS_SOPORTE = ["justificacion.pdf", "cita_medica.jpg", "excusa_medica.pdf"]

/**
 * Registros de asistencia individuales para "Seguimiento" — determinístico
 * por índice (no aleatorio), mismo criterio que `generarSesionesMes`: cada
 * estudiante repite un patrón fijo de tipo de asistencia a lo largo del mes,
 * así que la mezcla de estados es estable entre llamadas.
 */
function generarTodosLosRegistros(sedeId: number): AsistenciaQueryRow[] {
  const registros: AsistenciaQueryRow[] = []
  let pk = 1

  ESTUDIANTES.forEach((estudiante, i) => {
    const grupo = GRUPOS[(i + sedeId) % GRUPOS.length]
    const asignatura = ASIGNATURAS[i % ASIGNATURAS.length]
    // Patrón fijo por estudiante -- la mayoría "Asistió", una minoría con
    // ausencia/tardanza (con o sin justificación) para que la pantalla
    // muestre los 3 colores sin quedar desbalanceada.
    const patron: TipoAsistencia[] = [1, 1, 1, 1, i % 4 === 0 ? 2 : i % 3 === 0 ? 5 : 1]
    const anio = new Date().getFullYear()
    const mes = new Date().getMonth() + 1

    patron.forEach((tipoValor, j) => {
      const dia = 1 + ((i * 3 + j * 2) % 27)
      const tieneJustificacion = tipoValor === 2 && j % 2 === 0
      const tipoFinal: TipoAsistencia = tieneJustificacion ? 3 : tipoValor === 5 && j % 2 === 0 ? 6 : tipoValor
      const observacionesPosibles = OBSERVACIONES[tipoFinal]
      const observacion = observacionesPosibles
        ? observacionesPosibles[(i + j) % observacionesPosibles.length]
        : null
      const tieneSoporte = observacion !== null && (i + j) % 2 === 0

      registros.push({
        pk_tasistencia: pk++,
        estudiante: estudiante.nombre,
        documento: estudiante.documento,
        grupo: grupo.grupo,
        jornada: grupo.jornada,
        asignatura: asignatura.asignatura,
        fecha: `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
        bloque: 1,
        hora_inicio: null,
        hora_fin: null,
        tipo_asistencia_valor: tipoFinal,
        tipo_asistencia: TIPO_ASISTENCIA_NOMBRE[tipoFinal],
        observacion,
        tiene_soporte: tieneSoporte,
        fk_soporte_archivo: tieneSoporte ? pk : null,
        soporte_nombre: tieneSoporte ? ARCHIVOS_SOPORTE[(i + j) % ARCHIVOS_SOPORTE.length] : null,
        // Ventanas (total_estudiantes/ausentes/total_count) las calcula el
        // handler sobre el set YA filtrado -- acá quedan en 0 como
        // placeholder.
        total_estudiantes: 0,
        ausentes: 0,
        total_count: 0,
      })
    })
  })

  return registros
}

function normaliza(value: string): string {
  return value.toLowerCase().trim()
}

// Ediciones de PATCH /eval-col/asistencias/:ID -- el mock genera las filas
// de nuevo en cada request (no hay TASISTENCIA en memoria), así que sin esto
// un PATCH "funcionaría" (200) pero el siguiente GET/POST /query mostraría
// el dato original de vuelta. Vive a nivel de módulo -- persiste mientras
// dure la sesión del navegador, como cualquier "base de datos" de MSW.
const editOverrides = new Map<number, Partial<AsistenciaQueryRow>>()

export function aplicarEdicionAsistencia(pkTasistencia: number, patch: Partial<AsistenciaQueryRow>): void {
  editOverrides.set(pkTasistencia, { ...editOverrides.get(pkTasistencia), ...patch })
}

/** Filtra + calcula las 3 ventanas (total_estudiantes/ausentes/total_count) sobre el set filtrado completo. */
export function generarSeguimiento(
  sedeId: number,
  filters: AsistenciaQueryFilters,
): AsistenciaQueryRow[] {
  let rows = generarTodosLosRegistros(sedeId).map((row) => {
    const override = editOverrides.get(row.pk_tasistencia)
    return override ? { ...row, ...override } : row
  })

  if (filters.FECHA_DESDE) rows = rows.filter((r) => r.fecha >= filters.FECHA_DESDE!)
  if (filters.FECHA_HASTA) rows = rows.filter((r) => r.fecha <= filters.FECHA_HASTA!)
  if (filters.GRUPO != null) {
    rows = rows.filter((r) => GRUPOS.find((g) => g.grupo === r.grupo)?.fk_grupo === filters.GRUPO)
  }
  if (filters.ASIGNATURA != null) {
    rows = rows.filter(
      (r) => ASIGNATURAS.find((a) => a.asignatura === r.asignatura)?.fk_asignatura === filters.ASIGNATURA,
    )
  }
  if (filters.JORNADA) rows = rows.filter((r) => r.jornada === filters.JORNADA)
  if (filters.GRADO) rows = rows.filter((r) => gradoDeGrupo(r.grupo) === filters.GRADO)
  if (filters.TIPO_ASISTENCIA != null) {
    rows = rows.filter((r) => r.tipo_asistencia_valor === filters.TIPO_ASISTENCIA)
  }
  if (filters.SEARCH) {
    const needle = normaliza(filters.SEARCH)
    rows = rows.filter(
      (r) =>
        normaliza(r.estudiante).includes(needle) ||
        r.documento.includes(needle) ||
        normaliza(r.grupo).includes(needle) ||
        normaliza(r.asignatura).includes(needle),
    )
  }

  // Ventanas sobre el set filtrado COMPLETO: ausentes cuenta ESTUDIANTES
  // DISTINTOS (documento), no registros -- mismo criterio que el backend real.
  const totalEstudiantes = new Set(rows.map((r) => r.documento)).size
  const ausentes = new Set(rows.filter((r) => r.tipo_asistencia_valor === 2 || r.tipo_asistencia_valor === 3).map((r) => r.documento)).size
  const totalCount = rows.length

  return rows.map((r) => ({ ...r, total_estudiantes: totalEstudiantes, ausentes, total_count: totalCount }))
}

// ── Roster de un grupo (pantalla "Asistencia manual") ──────────────────────
// MOCK-ONLY: no hay todavía un endpoint real "estudiantes de un grupo" en el
// contrato de Asistencias (V220/V221 solo cubren calendario/resumen/
// seguimiento/registrar) -- falta confirmar con back si esto sale de
// `fn_matricula_listar` filtrado por grupo o de una función propia.
export interface RosterEstudiante {
  fkMatricula: number
  nombre: string
}

export function generarRosterGrupo(fkGrupo: number): RosterEstudiante[] {
  // Subconjunto determinístico por grupo (no todos los grupos tienen a
  // todos los estudiantes) -- rota el punto de partida para que cada grupo
  // se vea distinto, mismo criterio que el resto de estos generadores.
  const offset = fkGrupo % ESTUDIANTES.length
  const count = 6 + (fkGrupo % 3)
  return Array.from({ length: count }, (_, i) => {
    const estudiante = ESTUDIANTES[(offset + i) % ESTUDIANTES.length]
    return {
      fkMatricula: fkGrupo * 1000 + i,
      nombre: estudiante.nombre,
    }
  })
}
