import type {
  AsistenciaQueryFilters,
  AsistenciaQueryRow,
  AsistenciaRegistrarRequest,
  AsistenciaSesionEstudiantesParams,
  EstadoSesion,
  ResumenHoras,
  RosterEstudiante,
  SesionCalendario,
  TipoAsistencia,
} from "@/features/academic-management/asistencia/api/types/asistencia"

const GRUPOS = [
  { fk_grupo: 601, grupo: "601", grado: "6", gradoNombre: "Sexto", jornada: "C", jornadaNombre: "Completa" },
  { fk_grupo: 602, grupo: "602", grado: "6", gradoNombre: "Sexto", jornada: "T", jornadaNombre: "Tarde" },
  { fk_grupo: 701, grupo: "701", grado: "7", gradoNombre: "Séptimo", jornada: "C", jornadaNombre: "Completa" },
  { fk_grupo: 801, grupo: "801", grado: "8", gradoNombre: "Octavo", jornada: "T", jornadaNombre: "Tarde" },
]

const GRUPO_PREESCOLAR = { fk_grupo: 101, grupo: "PJ", grado: "PJ", gradoNombre: "Pre-Jardín", jornada: "M", jornadaNombre: "Mañana" }

const ASIGNATURAS = [
  { fk_asignatura: 1, asignatura: "Cognitiva" },
  { fk_asignatura: 2, asignatura: "Matemáticas" },
  { fk_asignatura: 3, asignatura: "Lenguaje" },
]

const ACTIVIDADES = [
  { fk_tactividad: 900, actividad: "Proyecto: Los animales" },
  { fk_tactividad: 901, actividad: "Proyecto: El cuerpo humano" },
  { fk_tactividad: 902, actividad: "Proyecto: Mi familia" },
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
          grado: grupo.grado,
          grado_nombre: grupo.gradoNombre,
          jornada: grupo.jornada,
          jornada_nombre: grupo.jornadaNombre,
          fk_asignatura: asignatura.fk_asignatura,
          asignatura: asignatura.asignatura,
          es_formativa: false,
          fk_tactividad: null,
          actividad: null,
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

    // Preescolar: UNA actividad por día (sin bloque, sin THORARIO) -- mismo
    // sentinel de bloque (0) que usa `registrarAsistenciaManual` más abajo
    // para las sesiones formativas.
    {
      const grupo = GRUPO_PREESCOLAR
      const actividad = ACTIVIDADES[(dia + grupo.fk_grupo) % ACTIVIDADES.length]
      const totalEstudiantes = 15 + ((dia + grupo.fk_grupo + sedeId) % 4)
      const ausentes = dia % 4
      const tarde = dia % 2
      const aTiempo = Math.max(0, totalEstudiantes - ausentes - tarde)
      const fechaIso = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
      const registrada = sesionesRegistradas.has(claveSesion(grupo.fk_grupo, actividad.fk_tactividad, fechaIso, 0))

      sesiones.push({
        fecha: fechaIso,
        bloque: null,
        fk_grupo: grupo.fk_grupo,
        grupo: grupo.grupo,
        grado: grupo.grado,
        grado_nombre: grupo.gradoNombre,
        jornada: grupo.jornada,
        jornada_nombre: grupo.jornadaNombre,
        fk_asignatura: ASIGNATURAS[0].fk_asignatura,
        asignatura: ASIGNATURAS[0].asignatura,
        es_formativa: true,
        fk_tactividad: actividad.fk_tactividad,
        actividad: actividad.actividad,
        hora_inicio: null,
        hora_fin: null,
        estado_sesion: registrada ? "REGISTRADA" : estadoDeSesion(fecha, hoy),
        total_estudiantes: totalEstudiantes,
        a_tiempo: aTiempo,
        tarde,
        ausentes,
        horas: 0,
      })
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
        es_formativa: false,
        fk_tactividad: null,
        actividad: null,
        // Ventanas (total_estudiantes/ausentes/tarde/total_count) las
        // calcula el handler sobre el set YA filtrado -- acá quedan en 0
        // como placeholder.
        total_estudiantes: 0,
        ausentes: 0,
        tarde: 0,
        total_count: 0,
      })
    })
  })

  // Preescolar (formativo): mismos estudiantes, pero la sesión es una
  // ACTIVIDAD -- `asignatura` queda vacía (`FK_TASIGNATURA` es `NULL` en el
  // registro real) y filtrar por ella no debe encontrar estas filas.
  ESTUDIANTES.forEach((estudiante, i) => {
    const actividad = ACTIVIDADES[i % ACTIVIDADES.length]
    const patron: TipoAsistencia[] = [1, 1, i % 3 === 0 ? 2 : 1]
    const anio = new Date().getFullYear()
    const mes = new Date().getMonth() + 1

    patron.forEach((tipoValor, j) => {
      const dia = 1 + ((i * 2 + j * 3) % 27)
      const observacionesPosibles = OBSERVACIONES[tipoValor]
      const observacion = observacionesPosibles ? observacionesPosibles[(i + j) % observacionesPosibles.length] : null

      registros.push({
        pk_tasistencia: pk++,
        estudiante: estudiante.nombre,
        documento: estudiante.documento,
        grupo: GRUPO_PREESCOLAR.grupo,
        jornada: GRUPO_PREESCOLAR.jornada,
        asignatura: "",
        fecha: `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
        bloque: null,
        hora_inicio: null,
        hora_fin: null,
        tipo_asistencia_valor: tipoValor,
        tipo_asistencia: TIPO_ASISTENCIA_NOMBRE[tipoValor],
        observacion,
        tiene_soporte: false,
        fk_soporte_archivo: null,
        soporte_nombre: null,
        es_formativa: true,
        fk_tactividad: actividad.fk_tactividad,
        actividad: actividad.actividad,
        total_estudiantes: 0,
        ausentes: 0,
        tarde: 0,
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
    rows = rows.filter((r) => [...GRUPOS, GRUPO_PREESCOLAR].find((g) => g.grupo === r.grupo)?.fk_grupo === filters.GRUPO)
  }
  if (filters.ASIGNATURA != null) {
    rows = rows.filter(
      (r) => !r.es_formativa && ASIGNATURAS.find((a) => a.asignatura === r.asignatura)?.fk_asignatura === filters.ASIGNATURA,
    )
  }
  if (filters.ACTIVIDAD != null) {
    rows = rows.filter((r) => r.es_formativa && r.fk_tactividad === filters.ACTIVIDAD)
  }
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
        normaliza(r.asignatura).includes(needle) ||
        (r.actividad != null && normaliza(r.actividad).includes(needle)),
    )
  }

  // Ventanas sobre el set filtrado COMPLETO: ausentes/tarde cuentan
  // ESTUDIANTES DISTINTOS (documento), no registros -- mismo criterio que
  // el backend real.
  const totalEstudiantes = new Set(rows.map((r) => r.documento)).size
  const ausentes = new Set(rows.filter((r) => r.tipo_asistencia_valor === 2 || r.tipo_asistencia_valor === 3).map((r) => r.documento)).size
  const tarde = new Set(rows.filter((r) => r.tipo_asistencia_valor === 5 || r.tipo_asistencia_valor === 6).map((r) => r.documento)).size
  const totalCount = rows.length

  return rows.map((r) => ({ ...r, total_estudiantes: totalEstudiantes, ausentes, tarde, total_count: totalCount }))
}

// ── Padrón de sesión (GET /asistencias/sesion/estudiantes, pantalla
// "Asistencia manual") ──────────────────────────────────────────────────────

interface EstudianteBase {
  fkMatricula: number
  nombre: string
  documento: string
}

/** Subconjunto determinístico por grupo (no todos los grupos tienen a todos los estudiantes). */
function padronBaseGrupo(fkGrupo: number): EstudianteBase[] {
  const offset = fkGrupo % ESTUDIANTES.length
  const count = 6 + (fkGrupo % 3)
  return Array.from({ length: count }, (_, i) => {
    const estudiante = ESTUDIANTES[(offset + i) % ESTUDIANTES.length]
    return { fkMatricula: fkGrupo * 1000 + i, nombre: estudiante.nombre, documento: estudiante.documento }
  })
}

interface RegistroManual {
  pk_tasistencia: number
  tipo_asistencia_valor: TipoAsistencia
  observacion: string | null
  fk_soporte_archivo: number | null
  soporte_nombre: string | null
}

// ── Subida de soporte (paso 1 de 2, POST /files/eval-col/tmp-icono-simbolo) ─
// El nombre original se pierde una vez resuelto a `pk_tarchivo` (el POST
// /registrar solo manda el id) -- se guarda acá para que el padrón pueda
// seguir mostrando el nombre real del archivo en vez de un genérico.
const archivosSubidos = new Map<number, string>()
let siguientePkArchivo = 900000

export function registrarArchivoSubido(nombre: string): number {
  const pk = siguientePkArchivo++
  archivosSubidos.set(pk, nombre)
  return pk
}

// Persiste, por `(matrícula, grupo, asignatura, fecha, bloque)`, lo que ya
// se registró -- el mock no tiene un TASISTENCIA real en memoria, así que
// sin esto un POST /registrar "funcionaría" pero el siguiente GET
// /sesion/estudiantes volvería a mostrar "Seleccionar" en vez del estado
// recién guardado.
const registrosManuales = new Map<string, RegistroManual>()
let siguientePkManual = 500000

function claveRegistroManual(fkMatricula: number, fkGrupo: number, fkAsignatura: number, fecha: string, bloque: number): string {
  return `${fkMatricula}-${fkGrupo}-${fkAsignatura}-${fecha}-${bloque}`
}

export function generarEstudiantesSesion(params: AsistenciaSesionEstudiantesParams): RosterEstudiante[] {
  // El mock no distingue asignatura de actividad como identidades separadas
  // -- alcanza con una clave numérica estable por sesión (BLOQUE default 1
  // para asignatura; sin BLOQUE para actividad, como en el back real).
  const identidad = params.ASIGNATURA ?? params.ACTIVIDAD ?? 0
  const bloque = params.ASIGNATURA != null ? (params.BLOQUE ?? 1) : 0
  const base = padronBaseGrupo(params.GRUPO)
  const registrados = base.filter((est) =>
    registrosManuales.has(claveRegistroManual(est.fkMatricula, params.GRUPO, identidad, params.FECHA, bloque)),
  ).length

  return base.map((est) => {
    const registro = registrosManuales.get(
      claveRegistroManual(est.fkMatricula, params.GRUPO, identidad, params.FECHA, bloque),
    )
    return {
      fk_tmatricula: est.fkMatricula,
      fk_testudiante: est.fkMatricula,
      estudiante: est.nombre,
      documento: est.documento,
      pk_tasistencia: registro?.pk_tasistencia ?? null,
      tipo_asistencia_valor: registro?.tipo_asistencia_valor ?? null,
      tipo_asistencia: registro ? TIPO_ASISTENCIA_NOMBRE[registro.tipo_asistencia_valor] : null,
      observacion: registro?.observacion ?? null,
      fk_soporte_archivo: registro?.fk_soporte_archivo ?? null,
      soporte_nombre: registro?.soporte_nombre ?? null,
      hora_inicio: null,
      hora_fin: null,
      fk_tperiodo_evaluacion: 1,
      total_estudiantes: base.length,
      registrados,
    }
  })
}

/** POST /asistencias/registrar -- persiste `MARCAR_TODOS`/`REGISTROS` en `registrosManuales` y marca la sesión. */
export function registrarAsistenciaManual(body: AsistenciaRegistrarRequest): number {
  const identidad = body.ASIGNATURA ?? body.ACTIVIDAD ?? 0
  const bloque = body.ASIGNATURA != null ? (body.BLOQUE ?? 1) : 0
  marcarSesionRegistrada(body.GRUPO, identidad, body.FECHA, bloque)

  function guardar(fkMatricula: number, tipo: TipoAsistencia, observacion?: string | null, fkArchivo?: unknown) {
    const key = claveRegistroManual(fkMatricula, body.GRUPO, identidad, body.FECHA, bloque)
    const existente = registrosManuales.get(key)
    const tieneArchivoNuevo = fkArchivo != null
    registrosManuales.set(key, {
      pk_tasistencia: existente?.pk_tasistencia ?? siguientePkManual++,
      tipo_asistencia_valor: tipo,
      observacion: observacion ?? existente?.observacion ?? null,
      fk_soporte_archivo: tieneArchivoNuevo ? Number(fkArchivo) : (existente?.fk_soporte_archivo ?? null),
      soporte_nombre: tieneArchivoNuevo
        ? (archivosSubidos.get(Number(fkArchivo)) ?? "soporte.pdf")
        : (existente?.soporte_nombre ?? null),
    })
  }

  if (body.REGISTROS?.length) {
    for (const r of body.REGISTROS) {
      guardar(r.fkMatricula, r.tipoAsistencia, r.observacion, r.fkArchivo)
    }
    return body.REGISTROS.length
  }

  if (body.MARCAR_TODOS != null) {
    const base = padronBaseGrupo(body.GRUPO)
    for (const est of base) {
      guardar(est.fkMatricula, body.MARCAR_TODOS)
    }
    return base.length
  }

  return 0
}
