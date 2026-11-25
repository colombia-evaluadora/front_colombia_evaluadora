import type {
  AdjuntoSesion,
  CargoVacio,
  IntegranteComite,
  IntegranteInput,
  MotivoQuorum,
  PeriodoComite,
  SesionDetalle,
  SesionInput,
} from "@/features/gestion-estudiantil/convivencia/api/comite-types"

/** Cálculos puros del Comité de Convivencia (3.3): vigencia, quórum y validaciones de integrantes y sesiones. */

export const HOY = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** `2026-10-28T…` → `2026-10-28`; las fechas del módulo son DATE y se comparan como texto ISO. */
export const dia = (fecha: string | null | undefined) => (fecha ? fecha.slice(0, 10) : "")

// ---------------------------------------------------------------------------------------------
// Períodos

/** El período abierto va primero en la respuesta; sin ninguno abierto, el primero que llegue. */
export function periodoPorDefecto(periodos: PeriodoComite[]): PeriodoComite | undefined {
  return periodos.find((p) => p.abierto) ?? periodos[0]
}

/** Rótulo del selector: la etiqueta del período, o su nombre y sede/jornada si no la trae. */
export function rotuloPeriodo(p: PeriodoComite): string {
  if (p.etiqueta) return p.etiqueta
  return [p.nombre, p.sede, p.jornada].filter(Boolean).join(" · ")
}

// ---------------------------------------------------------------------------------------------
// Vigencia y quórum

/** Vigente en `fecha`: desde <= fecha y hasta vacío o hasta > fecha (Regla 11). */
export function vigenteEn(i: Pick<IntegranteComite, "desde" | "hasta">, fecha: string): boolean {
  const f = dia(fecha)
  if (!f) return false
  const desde = dia(i.desde)
  const hasta = dia(i.hasta)
  return desde <= f && (!hasta || hasta > f)
}

export function integrantesVigentesEn<T extends Pick<IntegranteComite, "desde" | "hasta">>(integrantes: T[], fecha: string): T[] {
  return integrantes.filter((i) => vigenteEn(i, fecha))
}

/** Por que no hay quorum (Regla 23); el calculo lo hace el servidor, aqui solo se redacta el motivo. */
const TEXTO_MOTIVO_QUORUM: Record<MotivoQuorum, string> = {
  SIN_PRESIDENTE: "Sin el Rector, que preside el Comité, la sesión no tiene quórum aunque asistan los demás integrantes.",
  INSUFICIENTE: "No asistió más de la mitad de los integrantes.",
  ESTAMENTO_FALTANTE: "Falta al menos un integrante de un estamento con integrantes vigentes.",
}

export const textoMotivoQuorum = (motivo: string | null | undefined) =>
  motivo ? (TEXTO_MOTIVO_QUORUM[motivo as MotivoQuorum] ?? null) : null

/** Al cambiar la fecha, los asistentes marcados que ya no son vigentes se descartan. */
export function asistentesVigentes(asistentes: number[], vigentes: Pick<IntegranteComite, "id">[]): number[] {
  const ids = new Set(vigentes.map((v) => v.id))
  return asistentes.filter((a) => ids.has(a))
}

/** Sin integrantes vigentes no hay quórum que calcular: la sesión no se puede registrar. */
export const textoAsistentes = (n: number, m: number) => `${n} de ${m}`

// ---------------------------------------------------------------------------------------------
// Integrantes

export type DatoCargo = CargoVacio["dato"]

export interface FilaIntegrante {
  key: string
  /** Fila ya guardada en el Comité (no se puede editar, solo quitar). */
  id: number | null
  fk_tlv_cargo: string
  dato: DatoCargo | null
  codigo: string
  cargo_nombre: string
  fk_funcionario: number | null
  fk_matricula: number | null
  nombre: string
  /** Estamento del cargo (solo lectura): lo da el cargo, no se elige. */
  estamento: string
  desde: string
  hasta: string
}

export interface ErrorFilaIntegrante {
  cargo?: string
  persona?: string
  desde?: string
  hasta?: string
}

let contador = 0
export const nuevaKey = () => `k${++contador}`

export function filaIntegranteVacia(desde: string): FilaIntegrante {
  return {
    key: nuevaKey(),
    id: null,
    fk_tlv_cargo: "",
    dato: null,
    codigo: "",
    cargo_nombre: "",
    fk_funcionario: null,
    fk_matricula: null,
    nombre: "",
    estamento: "",
    desde,
    hasta: "",
  }
}

/** Una fila por cargo vacío, para que el usuario solo complete a la persona. */
export function filaDeCargoVacio(c: CargoVacio, desde: string): FilaIntegrante {
  return { ...filaIntegranteVacia(desde), fk_tlv_cargo: String(c.fk_tlv_cargo), dato: c.dato, codigo: c.cargo_codigo, cargo_nombre: c.cargo_nombre, estamento: c.estamento ?? "" }
}

/** Fila ya guardada: solo lectura, con su persona y su vigencia. */
export function filaDeIntegrante(i: IntegranteComite, dato: DatoCargo | null): FilaIntegrante {
  return {
    key: `i${i.id}`,
    id: i.id,
    fk_tlv_cargo: String(i.fk_tlv_cargo),
    dato,
    codigo: i.cargo_codigo,
    cargo_nombre: i.cargo_nombre,
    fk_funcionario: i.fk_funcionario,
    fk_matricula: i.fk_matricula,
    nombre: i.nombre,
    estamento: i.estamento ?? "",
    desde: dia(i.desde),
    hasta: dia(i.hasta),
  }
}

/** Qué dato identifica a la persona del cargo, según lo que informó el backend para ese cargo. */
export function datoDelCargo(cargosConocidos: Map<string, DatoCargo>, fkCargo: string): DatoCargo | null {
  return cargosConocidos.get(fkCargo) ?? null
}

export function validarFilaIntegrante(f: FilaIntegrante, inicioPeriodo: string, finPeriodo = ""): ErrorFilaIntegrante {
  const e: ErrorFilaIntegrante = {}
  if (!f.fk_tlv_cargo) e.cargo = "Elija el cargo."
  if (f.dato === "FUNCIONARIO" && f.fk_funcionario == null) e.persona = "Elija el funcionario."
  else if (f.dato === "ESTUDIANTE" && f.fk_matricula == null) e.persona = "Elija el estudiante."
  else if (f.dato === "NOMBRE" && f.nombre.trim().length < 3) e.persona = "Escriba el nombre (mínimo 3 caracteres)."
  else if (!f.dato && f.fk_tlv_cargo) e.persona = "Elija la persona."
  if (!f.desde) e.desde = "Indique desde cuándo."
  else if (inicioPeriodo && f.desde < inicioPeriodo) e.desde = "No puede ser anterior al inicio del período."
  else if (finPeriodo && f.desde > finPeriodo) e.desde = "No puede ser posterior al fin del período."
  if (f.hasta && f.desde && f.hasta <= f.desde) e.hasta = "Debe ser posterior a Desde."
  return e
}

export const filaConError = (e: ErrorFilaIntegrante) => Object.keys(e).length > 0

/** Un cargo con persona repetida y vigencias que se cruzan no se valida acá: lo decide el backend (409). */
export function integranteInput(f: FilaIntegrante): IntegranteInput {
  return {
    fk_tlv_cargo: Number(f.fk_tlv_cargo),
    ...(f.dato === "FUNCIONARIO" && { fk_funcionario: f.fk_funcionario ?? undefined }),
    ...(f.dato === "ESTUDIANTE" && { fk_matricula: f.fk_matricula ?? undefined }),
    ...(f.dato === "NOMBRE" && { nombre: f.nombre.trim() }),
    ...(f.desde && { desde: f.desde }),
    ...(f.hasta && { hasta: f.hasta }),
  }
}

/** Persona sin elegir en el campo que cambia según el dato del cargo. */
export const PERSONA_VACIA = { fk_funcionario: null, fk_matricula: null, nombre: "" } as const

// ---------------------------------------------------------------------------------------------
// Sesiones

export const LIM = {
  invitadoNombre: { min: 3, max: 150 },
  invitadoCalidad: { min: 3, max: 100 },
  decision: { min: 10, max: 3000 },
  otros: 5000,
  lugar: 100,
  objetivo: 300,
  ordenDia: 2000,
  forma: { min: 3, max: 300 },
  adjuntos: 5,
} as const

export interface InvitadoFila {
  key: string
  nombre: string
  calidad: string
}

export interface CasoFila {
  key: string
  fk_caso: number | null
  /** Tipo del caso elegido (TIPO_I/II/III): decide si el responsable es solo de seguimiento. */
  tipo_codigo: string
  numero: string
  decision: string
  responsable: string
  responsable_nombre: string
  fecha_seguimiento: string
}

export interface EleccionFila {
  key: string
  /** pk del integrante del Comité elegido. */
  integrante: string
  forma: string
}

export interface ValoresSesion {
  tipo: string
  fecha: string
  /** `HH:mm`; opcional. */
  hora: string
  lugar: string
  objetivo: string
  ordenDia: string
  /** pk del integrante (uno de los asistentes) que elabora el acta. */
  elabora: string
  eleccion: EleccionFila[]
  /** Archivos nuevos por subir. */
  adjuntos: File[]
  /** Ya guardados en la sesión; quitarlos de la lista los desvincula. */
  adjuntosGuardados: AdjuntoSesion[]
  asistentes: number[]
  invitados: InvitadoFila[]
  casos: CasoFila[]
  otros: string
}

export interface ErroresSesion {
  tipo?: string
  fecha?: string
  contenido?: string
  otros?: string
  asistentes?: string
  lugar?: string
  objetivo?: string
  ordenDia?: string
  elabora?: string
  eleccionGeneral?: string
  eleccion: Record<string, { integrante?: string; forma?: string }>
  invitados: Record<string, { nombre?: string; calidad?: string }>
  casos: Record<string, { caso?: string; decision?: string; fecha?: string }>
}

export const invitadoVacio = (): InvitadoFila => ({ key: nuevaKey(), nombre: "", calidad: "" })

export const eleccionVacia = (): EleccionFila => ({ key: nuevaKey(), integrante: "", forma: "" })

export const casoVacio = (): CasoFila => ({
  key: nuevaKey(),
  fk_caso: null,
  tipo_codigo: "",
  numero: "",
  decision: "",
  responsable: "",
  responsable_nombre: "",
  fecha_seguimiento: "",
})

/** La fecha arranca en hoy: los asistentes vigentes y el quórum se ven desde el inicio. */
export const valoresSesionVacios = (): ValoresSesion => ({
  tipo: "",
  fecha: new Date().toLocaleDateString("en-CA"),
  hora: "",
  lugar: "",
  objetivo: "",
  ordenDia: "",
  elabora: "",
  eleccion: [],
  adjuntos: [],
  adjuntosGuardados: [],
  asistentes: [],
  invitados: [],
  casos: [],
  otros: "",
})

/** Los Tipo II y III solo admiten responsable de seguimiento con rol permitido. */
export const soloSeguimiento = (tipoCodigo: string | null | undefined) => tipoCodigo === "TIPO_II" || tipoCodigo === "TIPO_III"

/** Precarga de Modificar: la sesión guardada → valores del formulario. `tipos` resuelve el código del tipo de sesión. */
export function desdeSesion(s: SesionDetalle): ValoresSesion {
  return {
    tipo: String(s.fk_tlv_tipo),
    fecha: dia(s.fecha),
    hora: s.hora ? s.hora.slice(0, 5) : "",
    lugar: s.lugar ?? "",
    objetivo: s.objetivo ?? "",
    ordenDia: s.orden_dia ?? "",
    elabora: s.elabora ? String(s.elabora.fk_integrante) : "",
    eleccion: (s.eleccion ?? []).map((e) => ({ key: nuevaKey(), integrante: String(e.fk_integrante), forma: e.forma_eleccion })),
    adjuntos: [],
    adjuntosGuardados: s.adjuntos ?? [],
    asistentes: s.asistentes.filter((a) => a.asistio).map((a) => a.fk_integrante),
    invitados: s.invitados.map((i) => ({ key: nuevaKey(), nombre: i.nombre, calidad: i.calidad })),
    casos: s.casos.map((c) => ({
      key: nuevaKey(),
      fk_caso: c.fk_caso,
      tipo_codigo: c.tipo_codigo,
      numero: String(c.numero),
      decision: c.decision,
      responsable: c.fk_funcionario_responsable != null ? String(c.fk_funcionario_responsable) : "",
      responsable_nombre: c.responsable_nombre ?? "",
      fecha_seguimiento: dia(c.fecha_seguimiento),
    })),
    otros: s.otros_temas ?? "",
  }
}

/** `conformacion`: el tipo de sesión es Conformación (registra la elección y no exige casos ni otros temas). */
export function validarSesion(v: ValoresSesion, conformacion = false): ErroresSesion {
  const e: ErroresSesion = { invitados: {}, casos: {}, eleccion: {} }
  if (!v.tipo) e.tipo = "Elija el tipo de sesión."
  if (!v.fecha) e.fecha = "Indique la fecha de la sesión."
  if (v.asistentes.length === 0) e.asistentes = "Marque al menos un asistente."

  for (const i of v.invitados) {
    const nombre = i.nombre.trim().length
    const calidad = i.calidad.trim().length
    const err: { nombre?: string; calidad?: string } = {}
    if (nombre < LIM.invitadoNombre.min || nombre > LIM.invitadoNombre.max)
      err.nombre = `El nombre debe tener entre ${LIM.invitadoNombre.min} y ${LIM.invitadoNombre.max} caracteres.`
    if (calidad < LIM.invitadoCalidad.min || calidad > LIM.invitadoCalidad.max)
      err.calidad = `La calidad debe tener entre ${LIM.invitadoCalidad.min} y ${LIM.invitadoCalidad.max} caracteres.`
    if (err.nombre || err.calidad) e.invitados[i.key] = err
  }

  const vistos = new Set<number>()
  for (const c of v.casos) {
    const err: { caso?: string; decision?: string; fecha?: string } = {}
    if (c.fk_caso == null) err.caso = "Elija el caso."
    else if (vistos.has(c.fk_caso)) err.caso = "Este caso ya está en la sesión."
    else vistos.add(c.fk_caso)
    const d = c.decision.trim().length
    if (d < LIM.decision.min || d > LIM.decision.max)
      err.decision = `La decisión debe tener entre ${LIM.decision.min} y ${LIM.decision.max} caracteres.`
    if (c.responsable && !c.fecha_seguimiento) err.fecha = "Indique la fecha de seguimiento."
    else if (c.fecha_seguimiento && v.fecha && c.fecha_seguimiento <= v.fecha) err.fecha = "Debe ser posterior a la fecha de la sesión."
    if (err.caso || err.decision || err.fecha) e.casos[c.key] = err
  }

  if (v.otros.length > LIM.otros) e.otros = `Máximo ${LIM.otros} caracteres.`
  if (v.lugar.trim().length > LIM.lugar) e.lugar = `Máximo ${LIM.lugar} caracteres.`
  if (v.objetivo.length > LIM.objetivo) e.objetivo = `Máximo ${LIM.objetivo} caracteres.`
  if (v.ordenDia.length > LIM.ordenDia) e.ordenDia = `Máximo ${LIM.ordenDia} caracteres.`
  if (v.elabora && !v.asistentes.includes(Number(v.elabora))) e.elabora = "Quien elabora el acta debe ser uno de los asistentes."

  if (conformacion) {
    if (v.eleccion.length === 0) e.eleccionGeneral = "Registre la elección de al menos un integrante."
    const elegidos = new Set<string>()
    for (const f of v.eleccion) {
      const err: { integrante?: string; forma?: string } = {}
      if (!f.integrante) err.integrante = "Elija el integrante."
      else if (elegidos.has(f.integrante)) err.integrante = "Este integrante ya está en la elección."
      else elegidos.add(f.integrante)
      const n = f.forma.trim().length
      if (n < LIM.forma.min || n > LIM.forma.max)
        err.forma = `La forma de elección debe tener entre ${LIM.forma.min} y ${LIM.forma.max} caracteres.`
      if (err.integrante || err.forma) e.eleccion[f.key] = err
    }
  } else if (v.casos.length === 0 && !v.otros.trim()) e.contenido = "Registre al menos un caso tratado u otros temas."
  return e
}

export const sesionConErrores = (e: ErroresSesion) =>
  Boolean(e.tipo || e.fecha || e.contenido || e.otros || e.asistentes || e.lugar || e.objetivo || e.ordenDia || e.elabora || e.eleccionGeneral) ||
  Object.keys(e.eleccion).length > 0 ||
  Object.keys(e.invitados).length > 0 ||
  Object.keys(e.casos).length > 0

/** `adjuntos`: pk de los archivos ya guardados en la sesión; los nuevos se suben al enviar. */
export function sesionInput(v: ValoresSesion, conformacion = false): SesionInput & { NUEVOS: File[]; ADJUNTOS: number[] } {
  return {
    FK_TLV_TIPO: Number(v.tipo),
    FECHA: v.fecha,
    HORA: v.hora || null,
    LUGAR: v.lugar.trim() || null,
    OBJETIVO: v.objetivo.trim() || null,
    ORDEN_DIA: v.ordenDia.trim() || null,
    FK_ASISTENTE_ELABORA: v.elabora ? Number(v.elabora) : null,
    ...(conformacion && {
      ELECCION: v.eleccion.map((f) => ({ fk_integrante: Number(f.integrante), forma_eleccion: f.forma.trim() })),
    }),
    ADJUNTOS: v.adjuntosGuardados.map((a) => a.fk_archivo),
    NUEVOS: v.adjuntos,
    ...(v.otros.trim() && { OTROS_TEMAS: v.otros.trim() }),
    ASISTENTES: v.asistentes,
    INVITADOS: v.invitados.map((i) => ({ nombre: i.nombre.trim(), calidad: i.calidad.trim() })),
    CASOS: v.casos.map((c) => ({
      fk_caso: c.fk_caso as number,
      decision: c.decision.trim(),
      ...(c.responsable && { fk_funcionario_responsable: Number(c.responsable) }),
      ...(c.responsable && c.fecha_seguimiento && { fecha_seguimiento: c.fecha_seguimiento }),
    })),
  }
}

/** Nombre del acta: el que da el servidor o, sin él, `acta-comite-<fecha>.pdf`. */
export const nombreActa = (s: { acta_nombre?: string | null; fecha: string }) => s.acta_nombre || `acta-comite-${dia(s.fecha)}.pdf`

/** Filtros aplicados del listado de sesiones (el texto libre va aparte). */
export interface SesionesFiltros {
  tipo: string
}

export const SESIONES_FILTROS_VACIOS: SesionesFiltros = { tipo: "" }
