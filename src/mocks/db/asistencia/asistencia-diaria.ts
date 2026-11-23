import {
  abrirSolicitudExterna,
  FUENTES_JUSTIFICACION,
  padronBaseGrupo,
  periodoCalificable,
  periodosEvaluacionGrupo,
  registrarArchivoSubido,
  toIso,
} from "@/mocks/db/asistencia/asistencia"

import type {
  DiariaBloqueRow,
  DiariaCalendarioRow,
  DiariaGrupoRow,
  DiariaPlanillaRow,
  DiariaPorGrupoRow,
  DiariaRegistrarRequest,
  DiariaRegistrarResultado,
  DiariaRegistro,
  ModoAsistencia,
  ModoAsistenciaGrupo,
  TipoAsistenciaDiaria,
} from "@/features/academic-management/asistencia/api/types/asistencia-diaria"

// Planilla diaria (Regla 115) en memoria, con la forma de V747-V748. El 602 es el grupo Diaria del mock.
const GRUPOS = [
  { fk: 601, grupo: "01", fkGrado: 6, grado: "Sexto", gradoValor: "6", fkJornada: 3, jornada: "Completa" },
  { fk: 602, grupo: "02", fkGrado: 6, grado: "Sexto", gradoValor: "6", fkJornada: 2, jornada: "Tarde" },
  { fk: 701, grupo: "03", fkGrado: 7, grado: "Séptimo", gradoValor: "7", fkJornada: 3, jornada: "Completa" },
  { fk: 801, grupo: "04", fkGrado: 8, grado: "Octavo", gradoValor: "8", fkJornada: 2, jornada: "Tarde" },
]

const modos = new Map<number, ModoAsistencia>([[602, "DIARIA"]])

export function modoDeGrupo(fk: number): ModoAsistencia {
  return modos.get(fk) ?? "POR_CLASE"
}

export function esGrupoDiario(fk: number): boolean {
  return modoDeGrupo(fk) === "DIARIA"
}

const NOMBRE_TIPO: Record<TipoAsistenciaDiaria, string> = { 1: "Asistió", 2: "No asistió", 5: "Llegó tarde" }
const NOMBRE_MODO: Record<ModoAsistencia, string> = { POR_CLASE: "Por clase", DIARIA: "Diaria" }

interface RegistroDiario {
  pk: number
  tipo: TipoAsistenciaDiaria
  bloque: number | null
  observacion: string | null
  fkArchivo: number | null
  soporteNombre: string | null
  justificacion: string | null
  fuente: number | null
  /** Alta de un día Pendiente en período No calificable: existe solo para la solicitud. */
  activo: boolean
}

const registros = new Map<string, RegistroDiario>()
const solicitudPorRegistro = new Map<number, { pk: number; tipo: TipoAsistenciaDiaria }>()
let siguientePk = 700000

const clave = (fkMatricula: number, fecha: string) => `${fkMatricula}|${fecha}`

/** Inhábiles del mock (los mismos del handler de días inhábiles): 6 y 20, más fines de semana. */
function esHabil(fecha: string): boolean {
  const d = new Date(`${fecha}T00:00:00`)
  return d.getDay() !== 0 && d.getDay() !== 6 && d.getDate() !== 6 && d.getDate() !== 20
}

/** Sin horario los viernes: el bloque de llegada no se ofrece. */
export function bloquesDelDia(_grupo: number, fecha: string): DiariaBloqueRow[] {
  const dia = new Date(`${fecha}T00:00:00`).getDay()
  if (dia === 5 || dia === 0 || dia === 6) return []
  const plan = [
    { fk: 1, nombre: "Aritmética" },
    { fk: 1, nombre: "Aritmética" },
    { fk: 3, nombre: "Lenguaje" },
    { fk: 2, nombre: "Ciencias naturales" },
  ]
  return plan.map((a, i) => ({
    bloque: i,
    fk_tasignatura: a.fk,
    asignatura: a.nombre,
    hora_inicio: `${fecha}T${String(7 + i).padStart(2, "0")}:00:00`,
    hora_fin: `${fecha}T${String(8 + i).padStart(2, "0")}:00:00`,
    primer_bloque_clase: i === 0 || plan[i - 1].fk !== a.fk,
  }))
}

function sancionDe(i: number, fecha: string): string | null {
  return i === 3 && Number(fecha.slice(8, 10)) % 7 === 0 ? "Suspensión de 1 día" : null
}

// Semilla: días hábiles del mes anterior y del actual hasta ayer, salvo uno de cada cinco.
function sembrar(): void {
  const hoy = new Date()
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  let n = 0
  for (let d = new Date(desde); toIso(d) < toIso(hoy); d.setDate(d.getDate() + 1)) {
    const fecha = toIso(d)
    if (!esHabil(fecha)) continue
    n += 1
    if (n % 5 === 0) continue
    padronBaseGrupo(602).forEach((e, i) => {
      const k = (i + n) % 9
      const tipo: TipoAsistenciaDiaria = sancionDe(i, fecha) || k === 0 ? 2 : k === 4 ? 5 : 1
      registros.set(clave(e.fkMatricula, fecha), {
        pk: siguientePk++,
        tipo,
        bloque: tipo === 5 && bloquesDelDia(602, fecha).length > 0 ? 2 : null,
        observacion: null,
        fkArchivo: null,
        soporteNombre: null,
        justificacion: tipo === 2 && k === 0 && i % 2 === 0 ? "Cita médica avisada por la madre" : null,
        fuente: tipo === 2 && k === 0 && i % 2 === 0 ? 1 : null,
        activo: true,
      })
    })
  }
}
sembrar()

function registradosDelDia(grupo: number, fecha: string): number {
  return padronBaseGrupo(grupo).filter((e) => registros.get(clave(e.fkMatricula, fecha))?.activo).length
}

/** GET /asistencias/diaria/calendario */
export function calendarioDiario(anio: number, mes: number, hoy: string): DiariaCalendarioRow[] {
  const filas: DiariaCalendarioRow[] = []
  const ultimo = new Date(anio, mes, 0).getDate()
  const limite = new Date(`${hoy}T00:00:00`)
  limite.setDate(limite.getDate() - 7)
  for (let dia = 1; dia <= ultimo; dia++) {
    const fecha = toIso(new Date(anio, mes - 1, dia))
    if (!esHabil(fecha)) continue
    for (const g of GRUPOS.filter((x) => esGrupoDiario(x.fk))) {
      const total = padronBaseGrupo(g.fk).length
      const registrados = registradosDelDia(g.fk, fecha)
      const estado = fecha > hoy ? "SIN_ESTADO" : registrados >= total ? "REGISTRADA" : "PENDIENTE"
      filas.push({
        fecha,
        fk_tgrupo: g.fk,
        grupo: g.grupo,
        fk_tgrado: g.fkGrado,
        grado: g.grado,
        grado_valor: g.gradoValor,
        fk_tlv_jornada: g.fkJornada,
        jornada: g.jornada,
        total_estudiantes: total,
        registrados,
        estado_sesion: estado,
        vencida: estado === "PENDIENTE" && fecha < toIso(limite),
      })
    }
  }
  return filas
}

/** GET /asistencias/diaria/planilla -- 22023 si el grupo no es Diaria. */
export function planillaDiaria(grupo: number, fecha: string): DiariaPlanillaRow[] | string {
  if (!esGrupoDiario(grupo)) return "El grupo no registra la asistencia en modo Diaria."
  const padron = padronBaseGrupo(grupo)
  const registrados = registradosDelDia(grupo, fecha)
  return padron.map((e, i) => {
    const r = registros.get(clave(e.fkMatricula, fecha))
    const activo = r?.activo ? r : null
    const sol = r ? solicitudPorRegistro.get(r.pk) : undefined
    return {
      fk_tmatricula: e.fkMatricula,
      estudiante: e.nombre,
      documento: e.documento,
      pk_tasistencia_diaria: activo?.pk ?? null,
      tipo_asistencia_valor: activo?.tipo ?? null,
      tipo_asistencia: activo ? NOMBRE_TIPO[activo.tipo] : null,
      bloque_llegada: activo?.bloque ?? null,
      observacion: activo?.observacion ?? null,
      fk_soporte_archivo: activo?.fkArchivo ?? null,
      soporte_nombre: activo?.soporteNombre ?? null,
      justificacion: activo?.justificacion ?? null,
      fk_tlv_fuente_justificacion: activo?.fuente ?? null,
      fuente_justificacion: activo?.fuente ? (FUENTES_JUSTIFICACION[activo.fuente] ?? null) : null,
      sancion: sancionDe(i, fecha),
      pk_tsolicitud_aprobacion: sol?.pk ?? null,
      cambio_tipo_asistencia_valor: sol?.tipo ?? null,
      total_estudiantes: padron.length,
      registrados,
      periodo_calificable: periodoCalificable(fecha),
      fk_tperiodo_evaluacion: 1,
    }
  })
}

type Fallo = { status: number; message: string }

/** POST /asistencias/diaria/registrar */
export function registrarDiaria(body: DiariaRegistrarRequest): DiariaRegistrarResultado | Fallo {
  const { GRUPO, FECHA } = body
  if (!esGrupoDiario(GRUPO)) return { status: 400, message: "El grupo no registra la asistencia en modo Diaria." }
  if (FECHA > toIso(new Date())) return { status: 400, message: "No se registra la asistencia de una fecha futura." }
  if (!esHabil(FECHA)) return { status: 400, message: "El día no es hábil para el grupo." }
  const padron = padronBaseGrupo(GRUPO)
  const entrada = body.REGISTROS?.length
    ? body.REGISTROS
    : padron
        .filter((e) => !registros.get(clave(e.fkMatricula, FECHA))?.activo)
        .map((e) => ({ fkMatricula: e.fkMatricula, tipoAsistencia: body.MARCAR_TODOS ?? 1 }))
  if (entrada.length === 0) return { registrados: 0, actividades_no_asistido: 0, solicitud: false, solicitudes_pendientes: [] }
  // La planilla se guarda completa: quien no viene ya tiene marca.
  const faltan = padron.filter(
    (e) => !entrada.some((r) => r.fkMatricula === e.fkMatricula) && !registros.get(clave(e.fkMatricula, FECHA))?.activo,
  )
  if (faltan.length > 0) return { status: 400, message: `Falta marcar la asistencia de ${faltan.length} estudiante(s).` }
  const bloques = bloquesDelDia(GRUPO, FECHA)
  for (const r of entrada) {
    if ("bloqueLlegada" in r && r.bloqueLlegada != null && !bloques.some((b) => b.bloque === r.bloqueLlegada)) {
      return { status: 400, message: "El bloque de llegada no está en el horario del grupo ese día." }
    }
  }

  const aplicar = (r: (typeof entrada)[number], previo?: RegistroDiario): RegistroDiario => {
    const reg = r as DiariaRegistro
    const fkArchivo = reg.fkArchivo ?? null
    const conJustificacion = "justificacion" in reg
    const justificacion =
      reg.tipoAsistencia === 1 || fkArchivo != null
        ? null
        : conJustificacion
          ? (reg.justificacion?.trim() || null)
          : (previo?.justificacion ?? null)
    return {
      pk: previo?.pk ?? siguientePk++,
      tipo: reg.tipoAsistencia,
      bloque: reg.tipoAsistencia === 5 && fkArchivo == null && justificacion == null ? (reg.bloqueLlegada ?? null) : null,
      observacion: reg.observacion ?? null,
      fkArchivo,
      soporteNombre: fkArchivo != null ? (previo && previo.fkArchivo === fkArchivo ? previo.soporteNombre : registrarArchivoNombre(fkArchivo)) : null,
      justificacion,
      fuente: justificacion == null ? null : conJustificacion ? (reg.fkFuenteJustificacion ?? null) : (previo?.fuente ?? null),
      activo: true,
    }
  }

  if (!periodoCalificable(FECHA)) {
    if (!body.MOTIVO?.trim()) {
      return { status: 400, message: "El período ya no es calificable: indique el motivo de la corrección." }
    }
    const abiertas: number[] = []
    for (const r of entrada) {
      const k = clave(r.fkMatricula, FECHA)
      const previo = registros.get(k)
      const nuevo = aplicar(r, previo?.activo ? previo : undefined)
      if (previo?.activo && previo.tipo === nuevo.tipo && previo.bloque === nuevo.bloque && previo.justificacion === nuevo.justificacion && previo.fkArchivo === nuevo.fkArchivo) continue
      const fila = previo ?? { ...nuevo, activo: false }
      if (!previo) registros.set(k, fila)
      const estudiante = padron.find((e) => e.fkMatricula === r.fkMatricula)?.nombre ?? ""
      const grupo = GRUPOS.find((g) => g.fk === GRUPO)
      const pk = abrirSolicitudExterna(
        {
          tipo: "CORRECCION_ASISTENCIA",
          estado: "PENDIENTE",
          tabla_objeto: "TASISTENCIA_DIARIA",
          fk_objeto: fila.pk,
          fk_tgrupo: GRUPO,
          // El back manda TGRUPO.NOMBRE, sin el grado.
          grupo: grupo?.grupo ?? "",
          fk_tasignatura: null,
          asignatura: null,
          fk_tperiodo_evaluacion: 1,
          periodo_evaluacion: "Período 1",
          fk_tactividad: null,
          actividad: null,
          estudiante,
          valor_anterior: {
            tipoAsistencia: previo?.activo ? String(previo.tipo) : null,
            bloqueLlegada: previo?.activo ? previo.bloque : null,
            observacion: previo?.activo ? previo.observacion : null,
            soporteArchivo: previo?.activo ? previo.fkArchivo : null,
            fecha: FECHA,
            justificacion: previo?.activo ? { texto: previo.justificacion, fkFuente: previo.fuente } : undefined,
          },
          valor_propuesto: {
            alta: !previo?.activo,
            tipoAsistencia: nuevo.tipo,
            bloqueLlegada: nuevo.bloque,
            observacion: nuevo.observacion,
            soporteArchivo: nuevo.fkArchivo,
            ...(nuevo.justificacion && { justificacion: { texto: nuevo.justificacion, fkFuente: nuevo.fuente } }),
          },
          solicitante: "Responsable de grupo",
          fecha_solicitud: new Date().toISOString(),
          motivo: body.MOTIVO,
          fk_tmatricula: r.fkMatricula,
          fecha: FECHA,
          bloque: null,
        },
        () => {
          registros.set(k, { ...nuevo, pk: fila.pk })
          solicitudPorRegistro.delete(fila.pk)
        },
      )
      solicitudPorRegistro.set(fila.pk, { pk, tipo: nuevo.tipo })
      abiertas.push(pk)
    }
    return { registrados: 0, actividades_no_asistido: 0, solicitud: abiertas.length > 0, solicitudes_pendientes: abiertas }
  }

  let noAsistido = 0
  for (const r of entrada) {
    const k = clave(r.fkMatricula, FECHA)
    const previo = registros.get(k)
    const nuevo = aplicar(r, previo?.activo ? previo : undefined)
    registros.set(k, nuevo)
    // Una actividad por asignatura del día queda No asistido (Regla 75).
    if (nuevo.tipo === 2) noAsistido += new Set(bloques.map((b) => b.fk_tasignatura)).size || 1
  }
  return { registrados: entrada.length, actividades_no_asistido: noAsistido, solicitud: false, solicitudes_pendientes: [] }
}

const nombresArchivo = new Map<number, string>()
function registrarArchivoNombre(fk: number): string {
  return nombresArchivo.get(fk) ?? "soporte.pdf"
}

/** POST /asistencias/soporte -- el mock no tenía este endpoint; guarda el nombre para la planilla. */
export function subirSoporteDiario(nombre: string): number {
  const pk = registrarArchivoSubido(nombre)
  nombresArchivo.set(pk, nombre)
  return pk
}

/** PATCH /asistencias/diaria/:ID/justificar */
export function justificarDiaria(pk: number, body: { JUSTIFICACION?: string; FUENTE?: number }): Fallo | null {
  const texto = body.JUSTIFICACION?.trim() ?? ""
  if (texto.length < 5 || texto.length > 200) return { status: 400, message: "La justificación debe tener entre 5 y 200 caracteres." }
  if (!body.FUENTE) return { status: 400, message: "La fuente de la justificación es obligatoria." }
  const r = [...registros.values()].find((x) => x.pk === pk && x.activo)
  if (!r) return { status: 404, message: "El registro de asistencia diaria no existe." }
  if (r.tipo === 1) return { status: 400, message: "Solo se justifica un No asistió o un Llegó tarde." }
  r.justificacion = texto
  r.fuente = body.FUENTE
  r.bloque = null
  return null
}

/** GET /asistencias/diaria/por-grupo */
export function porGrupoDiario(grupo: number, periodo: number): DiariaPorGrupoRow[] | string {
  if (!esGrupoDiario(grupo)) return "El grupo no registra la asistencia en modo Diaria."
  const p = periodosEvaluacionGrupo().find((x) => x.pk_tperiodo_evaluacion === periodo)
  if (!p) return []
  const hoy = toIso(new Date())
  const fin = p.fecha_fin < hoy ? p.fecha_fin : hoy
  const padron = padronBaseGrupo(grupo)
  const filas: DiariaPorGrupoRow[] = []
  for (let d = new Date(`${p.fecha_inicio}T00:00:00`); toIso(d) <= fin; d.setDate(d.getDate() + 1)) {
    const fecha = toIso(d)
    if (!esHabil(fecha)) continue
    const diaRegistrado = registradosDelDia(grupo, fecha) >= padron.length
    for (const e of padron) {
      const r = registros.get(clave(e.fkMatricula, fecha))
      const activo = r?.activo ? r : null
      filas.push({
        fecha,
        dia_registrado: diaRegistrado,
        fk_tmatricula: e.fkMatricula,
        estudiante: e.nombre,
        documento: e.documento,
        tipo_valor: activo?.tipo ?? null,
        justificada: Boolean(activo && activo.tipo !== 1 && (activo.fkArchivo != null || activo.justificacion)),
        en_grupo: true,
        bloque_llegada: activo?.bloque ?? null,
      })
    }
  }
  return filas
}

/** GET /grupos/:ID/modo-asistencia -- el 601 (asistencia) y el 6°B de Establecimiento (id 2) ya tienen asistencia: bloqueados. */
export function modoAsistenciaGrupo(fk: number): ModoAsistenciaGrupo {
  const modo = modoDeGrupo(fk)
  const bloqueado = fk === 601 || fk === 2 || (modo === "DIARIA" && [...registros.keys()].some((k) => padronBaseGrupo(fk).some((e) => k.startsWith(`${e.fkMatricula}|`))))
  return {
    modo,
    modo_nombre: NOMBRE_MODO[modo],
    bloqueado,
    motivo: bloqueado ? "El grupo ya tiene asistencia registrada en este período de evaluación." : null,
  }
}

/** PATCH /grupos/:ID/modo-asistencia -- 422 si está bloqueado. */
export function cambiarModoAsistencia(fk: number, modo: string): ModoAsistenciaGrupo | Fallo {
  const m = modo?.trim().toUpperCase()
  if (m !== "POR_CLASE" && m !== "DIARIA") return { status: 400, message: "Modo de registro de asistencia inválido." }
  const actual = modoAsistenciaGrupo(fk)
  if (actual.modo !== m && actual.bloqueado) {
    return { status: 422, message: "El grupo ya tiene asistencia registrada en este período de evaluación." }
  }
  modos.set(fk, m)
  return modoAsistenciaGrupo(fk)
}

const ASIGNATURAS_DIARIAS = [
  { fk_tasignatura: 1, asignatura: "Aritmética" },
  { fk_tasignatura: 2, asignatura: "Ciencias naturales" },
  { fk_tasignatura: 3, asignatura: "Lenguaje" },
]

/** GET /asistencias/diaria/grupos -- el docente (sin dirección de grupo) dicta solo Aritmética y no registra. */
export function gruposDiarios(puedeRegistrar: boolean): DiariaGrupoRow[] {
  return GRUPOS.filter((g) => esGrupoDiario(g.fk)).map((g) => ({
    fk_tgrupo: g.fk,
    grupo: g.grupo,
    fk_tgrado: g.fkGrado,
    grado: g.grado,
    grado_valor: g.gradoValor,
    fk_tlv_jornada: g.fkJornada,
    jornada: g.jornada,
    puede_registrar: puedeRegistrar,
    asignaturas: puedeRegistrar ? ASIGNATURAS_DIARIAS : ASIGNATURAS_DIARIAS.slice(0, 1),
  }))
}
