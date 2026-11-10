import type {
  LimitesSancion,
  OpcionSancion,
  SancionBody,
} from "@/features/gestion-estudiantil/convivencia/api/procesos-etapas-types"
import type { NotificacionDTO, ProcesoDetalle, SancionDTO } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import type { EtapaDecision } from "@/features/gestion-estudiantil/convivencia/api/procesos-detalle-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { errorPrueba, type PruebaFila } from "@/features/gestion-estudiantil/convivencia/utils/proceso-form"

/** Validaciones y armado de cuerpos de los modales de etapa (Proceso disciplinario - DTOs.md §4 y §5). */

/** Errores por clave de campo; las filas de un constructor usan `prueba:<key>` o `sancion:<key>:<campo>`. */
export type Errores = Record<string, string>

const MAX_BYTES = 10 * 1024 * 1024

/** Un archivo obligatorio de hasta 10 MB. */
function errorArchivo(archivos: File[], campo: string): string | undefined {
  if (archivos.length === 0) return `${campo} es obligatorio.`
  if (archivos[0].size > MAX_BYTES) return `${campo} supera los 10 MB.`
  return undefined
}

/** La fecha obligatoria entre `desde` y `hasta` (ISO `yyyy-MM-dd`, comparadas como texto). */
function errorFecha(fecha: string, campo: string, desde?: string | null, hasta?: string | null): string | undefined {
  if (!fecha) return `${campo} es obligatoria.`
  if (desde && fecha < desde) return `${campo} no puede ser anterior al ${formatFecha(desde)}.`
  if (hasta && fecha > hasta) return `${campo} no puede ser posterior al ${formatFecha(hasta)}.`
  return undefined
}

const poner = (e: Errores, clave: string, mensaje: string | undefined) => {
  if (mensaje) e[clave] = mensaje
}

// ---------- Sanciones (constructor de la decisión y de la resolución) ----------

export interface SancionFila {
  key: string
  /** `fk_tsancion` como texto de combo. */
  sancion: string
  inicio: string
  fin: string
  detalle: string
}

export const sancionVacia = (): SancionFila => ({ key: crypto.randomUUID(), sancion: "", inicio: "", fin: "", detalle: "" })

/** Una sanción vigente del proceso como fila editable (precarga de «Modifica»). */
export const filaDeSancion = (s: SancionDTO): SancionFila => ({
  key: crypto.randomUUID(),
  sancion: String(s.fk_tsancion),
  inicio: s.fecha_inicio ?? "",
  fin: s.fecha_fin ?? "",
  detalle: s.detalle ?? "",
})

/** La sanción del DTO como opción del catálogo, para que la precarga conserve su nombre aunque ya no esté activa. */
export const opcionDeSancion = (s: SancionDTO): OpcionSancion => ({
  id: s.fk_tsancion,
  nombre: s.nombre,
  descripcion: null,
  tiene_duracion: s.tiene_duracion,
  efecto: s.efecto,
})

/** Catálogo de la instancia más las sanciones precargadas que no estén en él. */
export function unirOpcionesSancion(catalogo: OpcionSancion[], precargadas: SancionDTO[]): OpcionSancion[] {
  const ids = new Set(catalogo.map((o) => o.id))
  return [...catalogo, ...precargadas.filter((s) => !ids.has(s.fk_tsancion)).map(opcionDeSancion)]
}

export function validarSanciones(
  filas: SancionFila[],
  catalogo: OpcionSancion[],
  limites: LimitesSancion | null | undefined,
  obligatorio: boolean,
): Errores {
  const e: Errores = {}
  if (obligatorio && filas.length === 0) e.sanciones = "Agregue al menos una sanción."
  const vistas = new Set<string>()
  for (const f of filas) {
    const k = `sancion:${f.key}:`
    const op = catalogo.find((o) => String(o.id) === f.sancion)
    if (!f.sancion) e[`${k}sancion`] = "Elija la sanción."
    else if (vistas.has(f.sancion)) e[`${k}sancion`] = "Una sanción solo puede ir una vez por decisión."
    vistas.add(f.sancion)
    if (op?.tiene_duracion) {
      poner(e, `${k}inicio`, errorFecha(f.inicio, "La fecha de inicio", limites?.inicio_minimo))
      poner(e, `${k}fin`, errorFecha(f.fin, "La fecha de fin", f.inicio || null, limites?.fin_maximo))
    }
  }
  return e
}

/** `SANCIONES` del cuerpo: las fechas solo viajan si la sanción tiene duración. */
export function sancionesBody(filas: SancionFila[], catalogo: OpcionSancion[]): SancionBody[] {
  return filas.map((f) => {
    const dura = catalogo.find((o) => String(o.id) === f.sancion)?.tiene_duracion ?? false
    return {
      fk_sancion: Number(f.sancion),
      fecha_inicio: dura ? f.inicio : null,
      fecha_fin: dura ? f.fin : null,
      detalle: f.detalle.trim() || null,
    }
  })
}

// ---------- Descargos (§4.1) ----------

export interface ValoresDescargos {
  presento: boolean | null
  fecha: string
  acudiente: boolean | null
  version: string
  otros: string
  pruebas: PruebaFila[]
  acta: File[]
  constancia: string
}

export function validarDescargos(v: ValoresDescargos, hoy: string, apertura: string | null): Errores {
  const e: Errores = {}
  if (v.presento == null) {
    e.presento = "Indique si el estudiante presentó descargos."
    return e
  }
  if (!v.presento) {
    poner(e, "constancia", errorLargo(v.constancia, 10, 1000, "La constancia"))
    return e
  }
  poner(e, "fecha", errorFecha(v.fecha, "La fecha de la diligencia", apertura, hoy))
  if (v.acudiente == null) e.acudiente = "Indique si el acudiente estuvo presente."
  poner(e, "version", errorLargo(v.version, 20, 5000, "La versión del estudiante"))
  v.pruebas.forEach((p) => poner(e, `prueba:${p.key}`, errorPrueba(p)))
  poner(e, "acta", errorArchivo(v.acta, "El acta de descargos"))
  return e
}

// ---------- Decisión (§4.2) ----------

export interface ValoresDecision {
  fecha: string
  instancia: string
  /** Código del resultado: `SANCIONAR` o `ARCHIVAR`. */
  resultado: string
  cargos: number[]
  motivacion: string
  sanciones: SancionFila[]
  acto: File[]
}

export function validarDecision(
  v: ValoresDecision,
  catalogo: OpcionSancion[],
  limites: LimitesSancion | null | undefined,
  hoy: string,
  descargos: string | null,
): Errores {
  const e: Errores = {}
  poner(e, "fecha", errorFecha(v.fecha, "La fecha de la decisión", descargos, hoy))
  if (!v.instancia) e.instancia = "Elija la instancia que decide."
  if (!v.resultado) e.resultado = "Elija el resultado."
  const sanciona = v.resultado === "SANCIONAR"
  if (sanciona && v.cargos.length === 0) e.cargos = "Elija al menos un cargo probado."
  poner(e, "motivacion", errorLargo(v.motivacion, 50, 5000, "La motivación"))
  if (sanciona) Object.assign(e, validarSanciones(v.sanciones, catalogo, limites, true))
  poner(e, "acto", errorArchivo(v.acto, "El acto de decisión"))
  return e
}

// ---------- Notificación presencial (§4.3) ----------

export function validarNotificacion(fecha: string, soporte: File[], hoy: string, acto: string | null): Errores {
  const e: Errores = {}
  poner(e, "fecha", errorFecha(fecha, "La fecha de notificación", acto, hoy))
  poner(e, "soporte", errorArchivo(soporte, "El soporte firmado"))
  return e
}

/** El acto cuya notificación sigue por confirmar: la decisión o la resolución de un recurso, con la fecha del acto. */
export function notificacionPendiente(
  p: ProcesoDetalle,
): { notificacion: NotificacionDTO; fechaActo: string | null } | null {
  const d = p.etapas.decision as EtapaDecision
  const candidatas = [
    ...(d.notificacion ? [{ notificacion: d.notificacion, fechaActo: d.fecha ?? null }] : []),
    ...p.etapas.recursos.items.flatMap((r) =>
      r.resolucion ? [{ notificacion: r.resolucion.notificacion, fechaActo: r.resolucion.fecha }] : [],
    ),
  ]
  return candidatas.reverse().find((c) => c.notificacion.estado === "POR_CONFIRMAR") ?? null
}

// ---------- Recurso (§4.4) ----------

export interface ValoresRecurso {
  tipo: string
  fecha: string
  presentacion: string
  argumentos: string
  escrito: File[]
  instancia: string
}

export function validarRecurso(v: ValoresRecurso, hoy: string, desde: string | null, limite: string | null): Errores {
  const e: Errores = {}
  if (!v.tipo) e.tipo = "Elija el tipo de recurso."
  const tope = limite && limite < hoy ? limite : hoy
  poner(e, "fecha", errorFecha(v.fecha, "La fecha de presentación", desde, tope))
  if (!v.presentacion) e.presentacion = "Indique quién presentó el recurso."
  poner(e, "argumentos", errorLargo(v.argumentos, 20, 5000, "Los argumentos"))
  poner(e, "escrito", errorArchivo(v.escrito, "El escrito del recurso"))
  if (!v.instancia) e.instancia = "Elija la instancia que resuelve."
  return e
}

// ---------- Resolución del recurso (§4.5) ----------

export interface ValoresResolucion {
  fecha: string
  /** Código del resultado: `CONFIRMA`, `MODIFICA` o `REVOCA`. */
  resultado: string
  motivacion: string
  sanciones: SancionFila[]
  acto: File[]
}

export function validarResolucion(
  v: ValoresResolucion,
  catalogo: OpcionSancion[],
  limites: LimitesSancion | null | undefined,
  hoy: string,
  presentacion: string | null,
): Errores {
  const e: Errores = {}
  poner(e, "fecha", errorFecha(v.fecha, "La fecha de la resolución", presentacion, hoy))
  if (!v.resultado) e.resultado = "Elija el resultado."
  poner(e, "motivacion", errorLargo(v.motivacion, 50, 5000, "La motivación"))
  if (v.resultado === "MODIFICA") Object.assign(e, validarSanciones(v.sanciones, catalogo, limites, true))
  poner(e, "acto", errorArchivo(v.acto, "El acto de la resolución"))
  return e
}

/** Aviso inferior de «Resolver recurso» según el resultado elegido y el tipo de recurso (§4.5). */
export function avisoResolucion(resultado: string, tipo: string, acudiente: string): string | null {
  const a = acudiente || "el acudiente"
  if (resultado === "REVOCA") return `El proceso quedará Archivado y se avisará a ${a}.`
  if (resultado !== "CONFIRMA" && resultado !== "MODIFICA") return null
  return tipo === "APELACION"
    ? `El proceso quedará En firme y se notificará la resolución a ${a}.`
    : `El proceso volverá a Decidido con estas sanciones y se notificará la resolución a ${a}.`
}

// ---------- Sanciones vigentes del proceso, cumplimiento y ajuste (§5) ----------

/** Vigente = ni Reemplazada ni Sin efecto. */
export const esVigente = (s: SancionDTO) => s.estado.codigo !== "REEMPLAZADA" && s.estado.codigo !== "SIN_EFECTO"

/** Sanciones vigentes: las de la firmeza o, antes, las de la última resolución que las fijó o las de la decisión. */
export function sancionesVigentes(p: ProcesoDetalle): SancionDTO[] {
  const firmeza = p.etapas.firmeza.sanciones
  if (firmeza.length) return firmeza.filter(esVigente)
  const resoluciones = p.etapas.recursos.items.flatMap((r) => (r.resolucion?.sanciones.length ? [r.resolucion.sanciones] : []))
  const ultima = resoluciones[resoluciones.length - 1]
  return (ultima ?? (p.etapas.decision as EtapaDecision).sanciones ?? []).filter(esVigente)
}

export const estaPendiente = (s: SancionDTO) => s.estado.codigo === "PENDIENTE"

/** «Queda pendiente: Actividad (fin: 04/06/2027).» o, si no queda ninguna, «… pasará a Cerrado» (§5.1). */
export function avisoCumplimiento(otras: SancionDTO[]): string {
  if (otras.length === 0) return "Con este registro el proceso pasará a Cerrado."
  const lista = otras.map((s) => (s.fecha_fin ? `${s.nombre} (fin: ${formatFecha(s.fecha_fin)})` : s.nombre)).join("; ")
  return `Queda pendiente: ${lista}.`
}

export function validarCumplimiento(resultado: string, observacion: string): Errores {
  const e: Errores = {}
  if (!resultado) e.resultado = "Elija el resultado."
  poner(e, "observacion", errorLargo(observacion, 10, 1000, "La observación"))
  return e
}

export function validarAjuste(inicio: string, fin: string, limites: LimitesSancion | null | undefined): Errores {
  const e: Errores = {}
  poner(e, "inicio", errorFecha(inicio, "La fecha de inicio"))
  poner(e, "fin", errorFecha(fin, "La fecha de fin", inicio || null, limites?.fin_maximo))
  return e
}

export const hayErrores = (e: Errores) => Object.keys(e).length > 0

// ---------- Mensajes de éxito (§4: el backend manda `mensaje: null` y `acudiente_nombre`) ----------

const acudienteDe = (r: Record<string, unknown>) => (typeof r.acudiente_nombre === "string" && r.acudiente_nombre ? r.acudiente_nombre : "el acudiente")

export const mensajeDecision = (r: Record<string, unknown>) =>
  r.estado_codigo === "ARCHIVADO" ? `Proceso archivado; se avisó a ${acudienteDe(r)}.` : `Decisión registrada; se notificó a ${acudienteDe(r)}.`

export const mensajeResolucion = (r: Record<string, unknown>) =>
  r.estado_codigo === "ARCHIVADO" ? `Recurso resuelto; se archivó el proceso y se avisó a ${acudienteDe(r)}.` : `Recurso resuelto; se notificó la resolución a ${acudienteDe(r)}.`

export const mensajeAjuste = (r: Record<string, unknown>) => `Fechas ajustadas; se avisó a ${acudienteDe(r)}.`
