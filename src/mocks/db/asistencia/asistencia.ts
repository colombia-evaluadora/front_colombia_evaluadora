import type {
  AsistenciaEditarRequest,
  AsistenciaEditarResponse,
  AsistenciaQueryFilters,
  AsistenciaQueryRow,
  AsistenciaRegistrarRequest,
  AsistenciaSesionEstudiantesParams,
  EstadoSesion,
  ResumenHoras,
  RosterEstudiante,
  SesionCalendario,
  SolicitudAprobacionAsistencia,
  TipoAsistencia,
  ValorSolicitudAsistencia,
} from "@/features/academic-management/asistencia/api/types/asistencia"

// `grupo` es el NOMBRE de TGRUPO ("02"), no el curso: el curso va aparte en
// `grado` y la pantalla los pega ("6" + "02" -> "602"). Los nombres no se
// repiten entre grados porque los filtros del mock buscan el grupo por nombre.
const GRUPOS = [
  { fk_grupo: 601, grupo: "01", grado: "6", gradoNombre: "Sexto", jornada: "C", jornadaNombre: "Completa" },
  { fk_grupo: 602, grupo: "02", grado: "6", gradoNombre: "Sexto", jornada: "T", jornadaNombre: "Tarde" },
  { fk_grupo: 701, grupo: "03", grado: "7", gradoNombre: "Séptimo", jornada: "C", jornadaNombre: "Completa" },
  { fk_grupo: 801, grupo: "04", grado: "8", gradoNombre: "Octavo", jornada: "T", jornadaNombre: "Tarde" },
]

const GRUPO_PREESCOLAR = { fk_grupo: 101, grupo: "05", grado: "-1", gradoNombre: "Pre-Jardín", jornada: "M", jornadaNombre: "Mañana" }

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

/** El docente mockeado dicta solo en 601: con `MIAS=true` el backend real acota
 *  por TDOCENTE_ASIGNATURA, y acá se imita con un subconjunto fijo para que se
 *  note la diferencia contra el alcance de sede. */
const GRUPOS_DEL_DOCENTE = [601]

export function soloMisClases(sesiones: SesionCalendario[]): SesionCalendario[] {
  return sesiones.filter((s) => GRUPOS_DEL_DOCENTE.includes(s.fk_grupo))
}

/** Resumen de horas para las tarjetas del encabezado, a partir de las mismas sesiones generadas. */
export function generarResumenHoras(sedeId: number, fecha: Date, mias = false): ResumenHoras {
  const anio = fecha.getFullYear()
  const mes = fecha.getMonth() + 1
  const todas = generarSesionesMes(sedeId, anio, mes)
  const sesionesMes = mias ? soloMisClases(todas) : todas
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

      // Bloques SEGUIDOS de la misma asignatura: el backend los devuelve como
      // registros sueltos y `generarSeguimiento` los colapsa en una fila.
      const fechaIso = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
      for (let bloque = 1; bloque <= 1 + ((i + j) % 3); bloque++) {
        // El estado del patrón cae en UN bloque de la corrida; el resto asiste.
        // Así se ve "Llegó tarde · Bloque 2" y no toda la corrida marcada.
        const tipoBloque: TipoAsistencia = bloque === 1 + ((i + j) % 2) ? tipoFinal : 1
        registros.push({
          pk_tasistencia: pk++,
          estudiante: estudiante.nombre,
          documento: estudiante.documento,
          grupo: grupo.grupo,
          grado: grupo.gradoNombre,
          grado_valor: grupo.grado,
          jornada: grupo.jornada,
          asignatura: asignatura.asignatura,
          fecha: fechaIso,
          bloque,
          hora_inicio: horaBloque(fechaIso, bloque, 0),
          hora_fin: horaBloque(fechaIso, bloque, HORAS_BLOQUE),
          tipo_asistencia_valor: tipoBloque,
          tipo_asistencia: TIPO_ASISTENCIA_NOMBRE[tipoBloque],
          observacion,
          tiene_soporte: tieneSoporte,
          fk_soporte_archivo: tieneSoporte ? pk : null,
          soporte_nombre: tieneSoporte ? ARCHIVOS_SOPORTE[(i + j) % ARCHIVOS_SOPORTE.length] : null,
          es_formativa: false,
          fk_tactividad: null,
          actividad: null,
          cambio_pendiente: false,
          // Agrupación y ventanas las resuelve `generarSeguimiento` sobre el set
          // YA filtrado -- acá quedan en 0 como placeholder.
          pks: [],
          registros: 0,
          bloques: [],
          bloques_estado: [],
          hora_inicio_estado: null,
          hora_fin_estado: null,
          total_estudiantes: 0,
          asistieron: 0,
          ausentes: 0,
          tarde: 0,
          total_count: 0,
        })
      }
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
        grado: GRUPO_PREESCOLAR.gradoNombre,
        grado_valor: GRUPO_PREESCOLAR.grado,
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
        cambio_pendiente: false,
        pks: [],
        registros: 0,
        bloques: [],
        bloques_estado: [],
        hora_inicio_estado: null,
        hora_fin_estado: null,
        total_estudiantes: 0,
        asistieron: 0,
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

/** Qué estado manda en una corrida mezclada, 1 = gana -- calca `fn_asistencia_tipo_prioridad`. */
const PRIORIDAD_TIPO: Record<TipoAsistencia, number> = { 5: 1, 6: 2, 2: 3, 3: 4, 1: 5 }

/**
 * Colapsa los bloques CONSECUTIVOS de una misma (estudiante, fecha, asignatura
 * o actividad) en una fila, como `fn_asistencia_listar_seguimiento`: el estado
 * de la corrida sale de `PRIORIDAD_TIPO` (la tardanza manda sobre la
 * inasistencia) y `pks` lleva todos los registros para poder editarla entera.
 * Una toma sin bloque no se agrupa con nadie.
 */
function agruparCorridas(rows: AsistenciaQueryRow[]): AsistenciaQueryRow[] {
  const sesiones = new Map<string, AsistenciaQueryRow[]>()
  for (const row of rows) {
    const clave =
      row.bloque === null
        ? `suelta-${row.pk_tasistencia}`
        : `${row.documento}|${row.grupo}|${row.fecha}|${row.asignatura}|${row.fk_tactividad}`
    sesiones.set(clave, [...(sesiones.get(clave) ?? []), row])
  }

  const corridas: AsistenciaQueryRow[][] = []
  for (const sesion of sesiones.values()) {
    let corrida: AsistenciaQueryRow[] = []
    for (const row of [...sesion].sort((a, b) => (a.bloque ?? 0) - (b.bloque ?? 0))) {
      const anterior = corrida[corrida.length - 1]
      // Un hueco entre bloques abre una corrida nueva.
      if (anterior && row.bloque !== (anterior.bloque ?? 0) + 1) {
        corridas.push(corrida)
        corrida = []
      }
      corrida.push(row)
    }
    if (corrida.length > 0) corridas.push(corrida)
  }

  return corridas.map((corrida) => {
    const porGravedad = [...corrida].sort(
      (a, b) => PRIORIDAD_TIPO[a.tipo_asistencia_valor] - PRIORIDAD_TIPO[b.tipo_asistencia_valor],
    )
    const ganador = porGravedad[0]
    const conSoporte = porGravedad.find((r) => r.tiene_soporte) ?? ganador
    // Los bloques que llevan el estado ganador: dónde ocurrió lo que la fila reporta.
    const delEstado = corrida.filter((r) => r.tipo_asistencia_valor === ganador.tipo_asistencia_valor)
    return {
      ...ganador,
      pk_tasistencia: corrida[0].pk_tasistencia,
      pks: corrida.map((r) => r.pk_tasistencia),
      registros: corrida.length,
      bloques: corrida.map((r) => r.bloque).filter((b): b is number => b !== null),
      bloques_estado: delEstado.map((r) => r.bloque).filter((b): b is number => b !== null),
      hora_inicio_estado: delEstado[0]?.hora_inicio ?? null,
      hora_fin_estado: delEstado[delEstado.length - 1]?.hora_fin ?? null,
      bloque: corrida[0].bloque,
      observacion: porGravedad.find((r) => r.observacion !== null)?.observacion ?? null,
      tiene_soporte: conSoporte.tiene_soporte,
      fk_soporte_archivo: conSoporte.fk_soporte_archivo,
      soporte_nombre: conSoporte.soporte_nombre,
    }
  })
}

/** Filtra, agrupa por corrida de bloques y calcula las 4 ventanas sobre el set filtrado completo. */
export function generarSeguimiento(
  sedeId: number,
  filters: AsistenciaQueryFilters,
): AsistenciaQueryRow[] {
  let rows = generarTodosLosRegistros(sedeId).map((row) => {
    const override = editOverrides.get(row.pk_tasistencia)
    return override ? { ...row, ...override } : row
  })
  for (const row of rows) filasSeguimiento.set(row.pk_tasistencia, row)

  if (filters.FECHA_DESDE) rows = rows.filter((r) => r.fecha >= filters.FECHA_DESDE!)
  if (filters.FECHA_HASTA) rows = rows.filter((r) => r.fecha <= filters.FECHA_HASTA!)
  // JORNADA y GRADO llegan como NOMBRE, no como código: fn_asistencia_listar_seguimiento
  // los compara contra TLISTA_VALOR.NOMBRE / TGRADO.NOMBRE.
  if (filters.JORNADA) {
    rows = rows.filter(
      (r) => [...GRUPOS, GRUPO_PREESCOLAR].find((g) => g.grupo === r.grupo)?.jornadaNombre === filters.JORNADA,
    )
  }
  if (filters.GRADO) {
    rows = rows.filter(
      (r) => [...GRUPOS, GRUPO_PREESCOLAR].find((g) => g.grupo === r.grupo)?.gradoNombre === filters.GRADO,
    )
  }
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

  // El tipo filtra el estado de la FILA ya agrupada, no el de cada bloque: pedir
  // "Llegó tarde" trae la corrida entera marcada así, no solo el bloque tarde.
  const agrupadas = agruparCorridas(rows).filter(
    (r) => filters.TIPO_ASISTENCIA == null || r.tipo_asistencia_valor === filters.TIPO_ASISTENCIA,
  )

  // Ventanas sobre el set filtrado COMPLETO: cuentan ESTUDIANTES DISTINTOS
  // (documento), no registros -- mismo criterio que el backend real.
  const distintos = (filtro: (r: AsistenciaQueryRow) => boolean) =>
    new Set(agrupadas.filter(filtro).map((r) => r.documento)).size
  const totalEstudiantes = new Set(agrupadas.map((r) => r.documento)).size
  const asistieron = distintos((r) => r.tipo_asistencia_valor === 1)
  const ausentes = distintos((r) => r.tipo_asistencia_valor === 2 || r.tipo_asistencia_valor === 3)
  const tarde = distintos((r) => r.tipo_asistencia_valor === 5 || r.tipo_asistencia_valor === 6)

  return agrupadas.map((r) => ({
    ...r,
    total_estudiantes: totalEstudiantes,
    asistieron,
    ausentes,
    tarde,
    total_count: agrupadas.length,
    cambio_pendiente: r.pks.some((pk) => solicitudPorAsistencia.has(pk)),
  }))
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
  /** Para que el PATCH arme la solicitud con grupo, materia y fecha. */
  contexto: {
    fkMatricula: number
    fkGrupo: number
    fecha: string
    bloque: number | null
    asignatura?: number
    actividad?: number
  }
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
    const clave = claveRegistroManual(est.fkMatricula, params.GRUPO, identidad, params.FECHA, bloque)
    const registro = registrosManuales.get(clave)
    const solicitud = solicitudPendienteDe(registro?.pk_tasistencia ?? altasPendientes.get(clave) ?? null)
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
      periodo_calificable: periodoCalificable(params.FECHA),
      // Pedidos al backend: hoy no vienen en el padrón real.
      pk_tsolicitud_aprobacion: solicitud?.fila.pk_tsolicitud_aprobacion ?? null,
      cambio_tipo_asistencia_valor:
        solicitud?.fila.valor_propuesto.tipoAsistencia != null
          ? (Number(solicitud.fila.valor_propuesto.tipoAsistencia) as TipoAsistencia)
          : null,
      total_estudiantes: base.length,
      registrados,
    }
  })
}

/**
 * POST /asistencias/registrar -- persiste `MARCAR_TODOS`/`REGISTROS` en
 * `registrosManuales` y marca la sesión. Regla 75, como el backend: en período
 * no calificable no escribe; corregir o capturar tarde abre solicitudes.
 * `directo` solo lo usa la semilla.
 */
export function registrarAsistenciaManual(
  body: AsistenciaRegistrarRequest,
  directo = false,
): { registros_afectados: number; solicitudes_pendientes: number[] } {
  const identidad = body.ASIGNATURA ?? body.ACTIVIDAD ?? 0
  const bloque = body.ASIGNATURA != null ? (body.BLOQUE ?? 1) : 0
  const cerrado = !directo && !periodoCalificable(body.FECHA)
  const resultado = { registros_afectados: 0, solicitudes_pendientes: [] as number[] }

  function guardar(fkMatricula: number, tipo: TipoAsistencia, observacion?: string | null, fkArchivo?: unknown) {
    const key = claveRegistroManual(fkMatricula, body.GRUPO, identidad, body.FECHA, bloque)
    const existente = registrosManuales.get(key)
    const archivo = fkArchivo != null ? Number(fkArchivo) : null
    const contexto = {
      fkMatricula,
      fkGrupo: body.GRUPO,
      fecha: body.FECHA,
      bloque: body.ASIGNATURA != null ? bloque : null,
      asignatura: body.ASIGNATURA,
      actividad: body.ACTIVIDAD,
    }
    const escribir = (pk?: number) => {
      marcarSesionRegistrada(body.GRUPO, identidad, body.FECHA, bloque)
      registrosManuales.set(key, {
        pk_tasistencia: existente?.pk_tasistencia ?? pk ?? siguientePkManual++,
        tipo_asistencia_valor: tipo,
        observacion: observacion ?? existente?.observacion ?? null,
        fk_soporte_archivo: archivo ?? existente?.fk_soporte_archivo ?? null,
        soporte_nombre: archivo != null
          ? (archivosSubidos.get(archivo) ?? "soporte.pdf")
          : (existente?.soporte_nombre ?? null),
        contexto,
      })
    }

    if (!cerrado) {
      escribir()
      resultado.registros_afectados++
      return
    }

    if (existente) {
      const cambia = tipo !== existente.tipo_asistencia_valor || (archivo != null && archivo !== existente.fk_soporte_archivo)
      if (!cambia) return
      const r = editarAsistencia(existente.pk_tasistencia, {
        TIPO_ASISTENCIA: tipo,
        ...(archivo != null && { SOPORTE_ARCHIVO: archivo }),
      })
      if (r) resultado.solicitudes_pendientes.push(...r.solicitudes_pendientes)
      return
    }

    // Captura tardía: la fila "espera" sin escribirse, como la inactiva del backend.
    const pkAlta = altasPendientes.get(key) ?? siguientePkManual++
    altasPendientes.set(key, pkAlta)
    resultado.solicitudes_pendientes.push(
      abrirSolicitud(
        pkAlta,
        { ...sesionDeContexto(contexto), anterior: { tipoAsistencia: null, observacion: null, soporteArchivo: null, fecha: body.FECHA, bloque: contexto.bloque } },
        { alta: true, tipoAsistencia: tipo, observacion: observacion ?? null, soporteArchivo: archivo },
        () => {
          altasPendientes.delete(key)
          escribir(pkAlta)
        },
      ),
    )
  }

  if (body.REGISTROS?.length) {
    for (const r of body.REGISTROS) guardar(r.fkMatricula, r.tipoAsistencia, r.observacion, r.fkArchivo)
  } else if (body.MARCAR_TODOS != null) {
    for (const est of padronBaseGrupo(body.GRUPO)) guardar(est.fkMatricula, body.MARCAR_TODOS)
  }
  return resultado
}

// ── Regla 75: solicitudes de aprobación (V496.18-21) ───────────────────────

/** El mock da por No calificable todo lo anterior al día 8 del mes actual. */
export function periodoCalificable(fecha: string): boolean {
  const hoy = new Date()
  const corte = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-08`
  return fecha.slice(0, 10) >= corte
}

interface SolicitudMock {
  fila: SolicitudAprobacionAsistencia
  aplicar: () => void
}

const solicitudes = new Map<number, SolicitudMock>()
// Una pendiente por registro: la propuesta nueva reemplaza la anterior.
const solicitudPorAsistencia = new Map<number, number>()
let siguientePkSolicitud = 5900
const DOCENTE_MOCK = "Carlos Mejía"

// Capturas tardías pendientes por clave de sesión, con el pk que tendrán al aprobarse.
const altasPendientes = new Map<string, number>()

// Filas de Seguimiento por pk: el PATCH no manda la sede para regenerarlas.
const filasSeguimiento = new Map<number, AsistenciaQueryRow>()

function solicitudPendienteDe(pkTasistencia: number | null): SolicitudMock | undefined {
  if (pkTasistencia == null) return undefined
  const pk = solicitudPorAsistencia.get(pkTasistencia)
  return pk != null ? solicitudes.get(pk) : undefined
}

interface RegistroEditable {
  fecha: string
  fkMatricula: number | null
  bloque: number | null
  fkGrupo: number
  asignatura: string | null
  fkAsignatura: number | null
  actividad: string | null
  fkActividad: number | null
  estudiante: string
  anterior: ValorSolicitudAsistencia
  aplicar: (body: AsistenciaEditarRequest) => void
}

type ContextoRegistro = RegistroManual["contexto"]

/** Grupo, materia y estudiante de un registro manual, para armar su solicitud. */
function sesionDeContexto(c: ContextoRegistro): Omit<RegistroEditable, "anterior" | "aplicar"> {
  return {
    fecha: c.fecha,
    fkMatricula: c.fkMatricula,
    bloque: c.bloque,
    fkGrupo: c.fkGrupo,
    asignatura: ASIGNATURAS.find((a) => a.fk_asignatura === c.asignatura)?.asignatura ?? null,
    fkAsignatura: c.asignatura ?? null,
    actividad: ACTIVIDADES.find((a) => a.fk_tactividad === c.actividad)?.actividad ?? null,
    fkActividad: c.actividad ?? null,
    estudiante: padronBaseGrupo(c.fkGrupo).find((e) => e.fkMatricula === c.fkMatricula)?.nombre ?? "",
  }
}

function buscarRegistro(pk: number): RegistroEditable | null {
  for (const registro of registrosManuales.values()) {
    if (registro.pk_tasistencia !== pk) continue
    const c = registro.contexto
    return {
      ...sesionDeContexto(c),
      anterior: {
        tipoAsistencia: String(registro.tipo_asistencia_valor),
        observacion: registro.observacion,
        soporteArchivo: registro.fk_soporte_archivo,
        fecha: c.fecha,
        bloque: c.bloque,
      },
      aplicar: (body) => {
        if (body.TIPO_ASISTENCIA != null) registro.tipo_asistencia_valor = body.TIPO_ASISTENCIA
        if (body.LIMPIAR_OBSERVACION) registro.observacion = null
        else if (body.OBSERVACION != null) registro.observacion = body.OBSERVACION
        if (body.LIMPIAR_ARCHIVO) {
          registro.fk_soporte_archivo = null
          registro.soporte_nombre = null
        } else if (body.SOPORTE_ARCHIVO != null) {
          registro.fk_soporte_archivo = body.SOPORTE_ARCHIVO
          registro.soporte_nombre = archivosSubidos.get(body.SOPORTE_ARCHIVO) ?? "soporte.pdf"
        }
      },
    }
  }

  const fila = filasSeguimiento.get(pk)
  if (!fila) return null
  const grupo = [...GRUPOS, GRUPO_PREESCOLAR].find((g) => g.grupo === fila.grupo)
  return {
    fecha: fila.fecha,
    fkMatricula: null,
    bloque: fila.bloque,
    fkGrupo: grupo?.fk_grupo ?? 0,
    asignatura: fila.es_formativa ? null : fila.asignatura,
    fkAsignatura: fila.es_formativa
      ? null
      : (ASIGNATURAS.find((a) => a.asignatura === fila.asignatura)?.fk_asignatura ?? null),
    actividad: fila.actividad,
    fkActividad: fila.fk_tactividad,
    estudiante: fila.estudiante,
    anterior: {
      tipoAsistencia: String(fila.tipo_asistencia_valor),
      observacion: fila.observacion,
      soporteArchivo: fila.fk_soporte_archivo,
      fecha: fila.fecha,
      bloque: fila.bloque,
    },
    aplicar: (body) =>
      aplicarEdicionAsistencia(pk, {
        ...(body.TIPO_ASISTENCIA != null && {
          tipo_asistencia_valor: body.TIPO_ASISTENCIA,
          tipo_asistencia: TIPO_ASISTENCIA_NOMBRE[body.TIPO_ASISTENCIA],
        }),
        ...(body.LIMPIAR_OBSERVACION
          ? { observacion: null }
          : body.OBSERVACION != null && { observacion: body.OBSERVACION }),
        ...(body.LIMPIAR_ARCHIVO && { tiene_soporte: false, fk_soporte_archivo: null, soporte_nombre: null }),
      }),
  }
}

/** PATCH /asistencias/:ID -- en período no calificable abre (o reemplaza) la solicitud (fn_asistencia_editar, V138). */
export function editarAsistencia(pk: number, body: AsistenciaEditarRequest): AsistenciaEditarResponse | null {
  const registro = buscarRegistro(pk)
  if (!registro) return null
  if (periodoCalificable(registro.fecha)) {
    registro.aplicar(body)
    return { pk_tasistencia: pk, solicitudes_pendientes: [] }
  }

  const pkSolicitud = abrirSolicitud(
    pk,
    registro,
    {
      tipoAsistencia: body.TIPO_ASISTENCIA ?? null,
      observacion: body.OBSERVACION ?? null,
      soporteArchivo: body.SOPORTE_ARCHIVO ?? null,
      limpiarArchivo: body.LIMPIAR_ARCHIVO ?? false,
      limpiarObservacion: body.LIMPIAR_OBSERVACION ?? false,
    },
    () => registro.aplicar(body),
  )
  return { pk_tasistencia: pk, solicitudes_pendientes: [pkSolicitud] }
}

/** Abre o reemplaza la pendiente del registro `pk` (una por registro). */
function abrirSolicitud(
  pk: number,
  registro: Omit<RegistroEditable, "aplicar">,
  propuesto: ValorSolicitudAsistencia,
  aplicar: () => void,
): number {
  const pkSolicitud = solicitudPorAsistencia.get(pk) ?? siguientePkSolicitud++
  solicitudPorAsistencia.set(pk, pkSolicitud)
  solicitudes.set(pkSolicitud, {
    aplicar,
    fila: {
      pk_tsolicitud_aprobacion: pkSolicitud,
      tipo: "CORRECCION_ASISTENCIA",
      estado: "PENDIENTE",
      tabla_objeto: "TASISTENCIA",
      fk_objeto: pk,
      fk_tgrupo: registro.fkGrupo,
      grupo: [...GRUPOS, GRUPO_PREESCOLAR].find((g) => g.fk_grupo === registro.fkGrupo)?.grupo ?? "",
      fk_tasignatura: registro.fkAsignatura,
      asignatura: registro.asignatura,
      fk_tperiodo_evaluacion: 1,
      periodo_evaluacion: "Primer periodo",
      fk_tactividad: registro.fkActividad,
      actividad: registro.actividad,
      estudiante: registro.estudiante,
      valor_anterior: registro.anterior,
      valor_propuesto: propuesto,
      solicitante: DOCENTE_MOCK,
      fecha_solicitud: new Date().toISOString(),
      motivo: null,
      fk_tmatricula: registro.fkMatricula,
      fecha: registro.fecha.slice(0, 10),
      bloque: registro.bloque,
    },
  })
  return pkSolicitud
}

/** GET /aprobaciones/pendientes */
export function listarSolicitudes(tipo: string | null): SolicitudAprobacionAsistencia[] {
  return [...solicitudes.values()].map((s) => s.fila).filter((s) => tipo == null || s.tipo === tipo)
}

/** POST /aprobaciones/:ID/aprobar|rechazar -- `null` = no existe (404). */
export function resolverSolicitud(pk: number, aprobar: boolean): Record<string, unknown> | null {
  const solicitud = solicitudes.get(pk)
  if (!solicitud) return null
  if (aprobar) solicitud.aplicar()
  solicitudes.delete(pk)
  solicitudPorAsistencia.delete(solicitud.fila.fk_objeto)
  return aprobar
    ? {
        pkSolicitud: pk,
        estado: "APROBADA",
        tipo: solicitud.fila.tipo,
        resultado: { aplicada: true, pk_tasistencia: solicitud.fila.fk_objeto },
        informeDesactualizado: false,
      }
    : { pkSolicitud: pk, estado: "RECHAZADA", valorVigente: solicitud.fila.valor_anterior }
}

// Semilla: una clase de dos bloques del docente en el mes anterior con dos
// correcciones pendientes, para ver el banner sin pasar antes por el docente.
function sembrarSolicitudesDemo(): void {
  const hoy = new Date()
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  const sesion = generarSesionesMes(0, mesAnterior.getFullYear(), mesAnterior.getMonth() + 1).find(
    (s) => GRUPOS_DEL_DOCENTE.includes(s.fk_grupo) && s.bloque === 1,
  )
  if (!sesion) return
  for (const bloque of [1, 2]) {
    const params = { GRUPO: sesion.fk_grupo, ASIGNATURA: sesion.fk_asignatura, FECHA: sesion.fecha, BLOQUE: bloque }
    registrarAsistenciaManual({ ...params, MARCAR_TODOS: 1 }, true)
    for (const est of generarEstudiantesSesion(params).slice(0, 2)) {
      if (est.pk_tasistencia != null) editarAsistencia(est.pk_tasistencia, { TIPO_ASISTENCIA: 2 })
    }
  }
}

sembrarSolicitudesDemo()
