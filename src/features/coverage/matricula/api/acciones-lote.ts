import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import { invalidarMatriculas, matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

// Acciones de la fila y de la barra de lote (C.1.LOT.1–8): la misma acción
// recibe una o varias matrículas. Pendiente en el back
// (docs/matricula/pendientes-back.md, tarea 10).

const BASE = "/cobertura-academica/matricula/lote"

/** Resultado por matrícula: el lote no se detiene si una falla. */
export interface ResultadoLote {
  matriculaId: string
  ok: boolean
  mensaje: string
}

interface ResultadoRow {
  pk_matricula: number
  ok: boolean
  mensaje: string | null
}

const toResultados = (rows: ResultadoRow[]): ResultadoLote[] =>
  rows.map((r) => ({ matriculaId: String(r.pk_matricula), ok: r.ok, mensaje: r.mensaje ?? "" }))

export const resumirLote = (resultados: ResultadoLote[]) => ({
  ok: resultados.filter((r) => r.ok).length,
  fallidas: resultados.filter((r) => !r.ok),
})

const ids = (matriculaIds: string[]) => matriculaIds.map(Number)

function useMutacionLote<V>(fn: (v: V) => Promise<ResultadoLote[]>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => invalidarMatriculas(queryClient) })
}

/* ───────────── Complementaria (avisos de retirar, reingresar, cambiar) ───────────── */

export interface Complementaria {
  sede: string
  jornada: string
  especialidad: string
}

/* ───────────── Retirar (C.1.LOT.1) ───────────── */

export interface PreviaRetiro {
  matriculaId: string
  complementaria: Complementaria | null
}

export function usePreviaRetiroQuery(matriculaIds: string[]) {
  return useQuery({
    queryKey: [...matriculaKeys.loteAll, "retiro", matriculaIds],
    queryFn: async (): Promise<PreviaRetiro[]> => {
      const rows = await evalCol.postRows<{ pk_matricula: number; complementaria: Complementaria | null }>(
        `${BASE}/retirar/previa`,
        { IDS: ids(matriculaIds) },
      )
      return rows.map((r) => ({ matriculaId: String(r.pk_matricula), complementaria: r.complementaria }))
    },
    staleTime: 0,
  })
}

export interface RetirarLoteInput {
  matriculaIds: string[]
  /** yyyy-MM-dd */
  fecha: string
  motivoRetiroId: number
  motivoNovedad: string
  observacion: string
}

export function useRetirarLote() {
  return useMutacionLote(async (v: RetirarLoteInput) =>
    toResultados(
      await evalCol.postRows<ResultadoRow>(`${BASE}/retirar`, {
        IDS: ids(v.matriculaIds),
        FECHA_RETIRO: v.fecha,
        FK_TLV_MOTIVO_RETIRO: v.motivoRetiroId,
        MOTIVO_NOVEDAD: v.motivoNovedad,
        OBSERVACION: v.observacion || null,
      }),
    ),
  )
}

/* ───────────── Reingresar (C.1.LOT.2 y 3, también sin cupo) ───────────── */

export interface GrupoDestino {
  id: number
  codigo: string
  ocupados: number
  capacidad: number
}

export interface PreviaReingreso {
  matriculaId: string
  /** yyyy-MM-dd */
  fechaRetiro: string
  grupoActual: string
  /** Cupos libres en su grupo: el lote no puede pasarse (C.1.LOT.3). */
  cuposLibres: number
  periodoAbierto: boolean
  /** El grupo de origen ya no tiene cupo: se elige otro del mismo grado. */
  sinCupo: boolean
  gruposConCupo: GrupoDestino[]
  /** Períodos de evaluación que transcurrieron durante el retiro: quedan Pendiente por nivelación. */
  periodosDuranteRetiro: string[]
  /** Caso de reintegración abierto (Gestión estudiantil). */
  casoReintegracion: string | null
  /** La complementaria no tiene cupo para volver: el reingreso se bloquea. */
  complementariaSinCupo: string | null
}

interface PreviaReingresoRow {
  pk_matricula: number
  fecha_retiro: string
  grupo_actual: string
  sin_cupo: boolean
  cupos_libres: number
  periodo_abierto: boolean
  grupos_con_cupo: { pk_grupo: number; codigo: string; ocupados: number; capacidad: number }[]
  periodos_durante_retiro: string[]
  caso_reintegracion: string | null
  complementaria_sin_cupo: string | null
}

export function usePreviaReingresoQuery(matriculaIds: string[]) {
  return useQuery({
    queryKey: [...matriculaKeys.loteAll, "reingreso", matriculaIds],
    queryFn: async (): Promise<PreviaReingreso[]> => {
      const rows = await evalCol.postRows<PreviaReingresoRow>(`${BASE}/reingresar/previa`, { IDS: ids(matriculaIds) })
      return rows.map((r) => ({
        matriculaId: String(r.pk_matricula),
        fechaRetiro: r.fecha_retiro,
        grupoActual: r.grupo_actual,
        sinCupo: r.sin_cupo,
        cuposLibres: r.cupos_libres,
        periodoAbierto: r.periodo_abierto,
        gruposConCupo: (r.grupos_con_cupo ?? []).map((g) => ({
          id: g.pk_grupo,
          codigo: g.codigo,
          ocupados: g.ocupados,
          capacidad: g.capacidad,
        })),
        periodosDuranteRetiro: r.periodos_durante_retiro ?? [],
        casoReintegracion: r.caso_reintegracion,
        complementariaSinCupo: r.complementaria_sin_cupo,
      }))
    },
    staleTime: 0,
  })
}

export interface ReingresarLoteInput {
  /** yyyy-MM-dd */
  fecha: string
  observacion: string
  /** Una entrada por matrícula; `grupoId` solo si su grupo ya no tiene cupo. */
  matriculas: { matriculaId: string; grupoId: number | null }[]
}

export function useReingresarLote() {
  return useMutacionLote(async (v: ReingresarLoteInput) =>
    toResultados(
      await evalCol.postRows<ResultadoRow>(`${BASE}/reingresar`, {
        FECHA_REINGRESO: v.fecha,
        OBSERVACION: v.observacion || null,
        MATRICULAS: v.matriculas.map((m) => ({ ID: Number(m.matriculaId), FK_TGRUPO: m.grupoId })),
      }),
    ),
  )
}

/* ───────────── Grupos destino con cupo ───────────── */

export function useGruposDestinoQuery(params: { sedeId: string; jornada: string; grado: number | null; periodoId?: number | null }) {
  const enabled = Boolean(params.sedeId && params.jornada && params.grado != null)
  return useQuery({
    queryKey: [...matriculaKeys.loteAll, "grupos-destino", params],
    queryFn: async (): Promise<GrupoDestino[]> => {
      const q = new URLSearchParams({
        FK_SEDE: params.sedeId,
        JORNADA: params.jornada,
        GRADO: String(params.grado),
        ...(params.periodoId ? { FK_PERIODO: String(params.periodoId) } : {}),
      })
      const rows = await evalCol.getRows<{ pk_grupo: number; codigo: string; ocupados: number; capacidad: number }>(
        `${BASE}/grupos-destino?${q}`,
      )
      return rows.map((g) => ({ id: g.pk_grupo, codigo: g.codigo, ocupados: g.ocupados, capacidad: g.capacidad }))
    },
    enabled,
    staleTime: 30_000,
  })
}

/* ───────────── Emparejamiento de notas (cambiar de grupo y de grado) ───────────── */

export type EstadoAsignatura = "EMPAREJADA" | "PENDIENTE_NIVELACION" | "SOLO_HISTORIAL"

export interface Emparejamiento {
  /** Etiqueta del tipo de cambio («Cambio de sede y jornada», «Mismo período · otro grado»). */
  tipo: string
  /** Mismo plan de estudio: no hay nada que emparejar. */
  mismoPlan: boolean
  periodos: { origen: string; enCurso: number | null; opciones: string[]; destino: string }[]
  asignaturas: { origen: string | null; destino: string | null; opciones: string[]; estado: EstadoAsignatura }[]
  escalaDistinta: boolean
}

interface EmparejamientoRow {
  tipo: string
  mismo_plan: boolean
  periodos: { origen: string; en_curso: number | null; opciones: string[]; destino: string }[]
  asignaturas: { origen: string | null; destino: string | null; opciones: string[]; estado: EstadoAsignatura }[]
  escala_distinta: boolean
}

export function useEmparejamientoQuery(matriculaIds: string[], grupoId: number | null, periodoId: number | null = null) {
  return useQuery({
    queryKey: [...matriculaKeys.loteAll, "emparejamiento", matriculaIds, grupoId, periodoId],
    queryFn: async (): Promise<Emparejamiento> => {
      const row = await evalCol.postRow<{ emparejamiento: EmparejamientoRow }>(`${BASE}/emparejamiento`, {
        IDS: ids(matriculaIds),
        FK_TGRUPO: grupoId,
        FK_PERIODO: periodoId,
      })
      const e = row.emparejamiento
      return {
        tipo: e.tipo,
        mismoPlan: e.mismo_plan,
        periodos: e.periodos.map((p) => ({ origen: p.origen, enCurso: p.en_curso, opciones: p.opciones, destino: p.destino })),
        asignaturas: e.asignaturas,
        escalaDistinta: e.escala_distinta,
      }
    },
    enabled: grupoId != null,
    staleTime: 0,
  })
}

/** Lo que la persona ajustó del emparejamiento: origen → destino. */
export interface EmparejamientoElegido {
  periodos: Record<string, string>
  asignaturas: Record<string, string>
}

const toEmparejamientoBody = (e: EmparejamientoElegido | null) =>
  e
    ? {
        PERIODOS: Object.entries(e.periodos).map(([ORIGEN, DESTINO]) => ({ ORIGEN, DESTINO })),
        ASIGNATURAS: Object.entries(e.asignaturas).map(([ORIGEN, DESTINO]) => ({ ORIGEN, DESTINO })),
      }
    : null

/* ───────────── Cambiar de grupo (C.1.LOT.4) ───────────── */

export function useComplementariasQuery(matriculaIds: string[]) {
  return useQuery({
    queryKey: [...matriculaKeys.loteAll, "complementarias", matriculaIds],
    queryFn: async () => {
      const rows = await evalCol.postRows<{ pk_matricula: number; complementaria: Complementaria | null }>(
        `${BASE}/complementarias`,
        { IDS: ids(matriculaIds) },
      )
      return new Map(rows.map((r) => [String(r.pk_matricula), r.complementaria]))
    },
    staleTime: 0,
  })
}

export interface CambiarGrupoLoteInput {
  matriculaIds: string[]
  grupoId: number
  emparejamiento: EmparejamientoElegido | null
}

export function useCambiarGrupoLote() {
  return useMutacionLote(async (v: CambiarGrupoLoteInput) =>
    toResultados(
      await evalCol.postRows<ResultadoRow>(`${BASE}/cambiar-grupo`, {
        IDS: ids(v.matriculaIds),
        FK_TGRUPO: v.grupoId,
        EMPAREJAMIENTO: toEmparejamientoBody(v.emparejamiento),
      }),
    ),
  )
}

/* ───────────── Cambiar o corregir grado (C.1.LOT.5) ───────────── */

export type TipoCambioGrado = "PROMOCION" | "REUBICACION" | "CORRECCION"

export interface PreviaCambioGrado {
  periodos: { id: number; label: string; sedeId: string; jornada: string }[]
  grados: { valor: number; nombre: string }[]
  /** Promoción anticipada: solo el grado siguiente. */
  gradoSiguiente: number | null
  /** Registros en Gestión Académica del grado actual (pide Homologar o Descartar al corregir). */
  registros: { actividades: number; definitivas: string[]; clases: number } | null
  /** Cuántas de la selección tienen registros (lote: «[N] de [M] estudiantes tienen registros»). */
  conRegistros: number
  /** La complementaria pasa a Retirado si el grado destino no tiene su especialidad. */
  complementaria: (Complementaria & { disponibleEnGradoSiguiente: boolean }) | null
}

interface PreviaCambioGradoRow {
  periodos: { pk_periodo: number; label: string; fk_sede: number; jornada: string }[]
  grados: { valor: number; nombre: string }[]
  grado_siguiente: number | null
  registros: { actividades: number; definitivas: string[]; clases: number } | null
  con_registros: number
  complementaria: (Complementaria & { disponible_en_grado_siguiente: boolean }) | null
}

export function usePreviaCambioGradoQuery(matriculaIds: string[]) {
  return useQuery({
    queryKey: [...matriculaKeys.loteAll, "cambio-grado", matriculaIds],
    queryFn: async (): Promise<PreviaCambioGrado> => {
      const row = await evalCol.postRow<{ previa: PreviaCambioGradoRow }>(`${BASE}/cambiar-grado/previa`, {
        IDS: ids(matriculaIds),
      })
      const p = row.previa
      return {
        periodos: p.periodos.map((x) => ({ id: x.pk_periodo, label: x.label, sedeId: String(x.fk_sede), jornada: x.jornada })),
        grados: p.grados,
        gradoSiguiente: p.grado_siguiente,
        registros: p.registros,
        conRegistros: p.con_registros ?? 0,
        complementaria: p.complementaria
          ? { ...p.complementaria, disponibleEnGradoSiguiente: p.complementaria.disponible_en_grado_siguiente }
          : null,
      }
    },
    staleTime: 0,
  })
}

export interface CambiarGradoLoteInput {
  matriculaIds: string[]
  tipo: TipoCambioGrado
  periodoId: number
  grupoId: number
  motivo: string
  acta: File | null
  emparejamiento: EmparejamientoElegido | null
  /** Solo en corrección con registros existentes. */
  registros: "HOMOLOGAR" | "DESCARTAR" | null
}

export function useCambiarGradoLote() {
  return useMutacionLote(async (v: CambiarGradoLoteInput) => {
    const rows = await postMultipart<{ rows: ResultadoRow[] }>(
      `/eval-col${BASE}/cambiar-grado`,
      {
        IDS: JSON.stringify(ids(v.matriculaIds)),
        TIPO: v.tipo,
        FK_PERIODO: v.periodoId,
        FK_TGRUPO: v.grupoId,
        MOTIVO: v.motivo,
        REGISTROS: v.registros,
        EMPAREJAMIENTO: v.emparejamiento ? JSON.stringify(toEmparejamientoBody(v.emparejamiento)) : null,
      },
      v.acta ? { ACTA: v.acta } : {},
    )
    return toResultados(rows?.rows ?? [])
  })
}

/* ───────────── Reactivar (C.1.LOT.6) ───────────── */

export function useReactivarLote() {
  return useMutacionLote(
    async (v: { matriculaIds: string[]; motivo: string; soporte: File | null }) => {
      const rows = await postMultipart<{ rows: ResultadoRow[] }>(
        `/eval-col${BASE}/reactivar`,
        { IDS: JSON.stringify(ids(v.matriculaIds)), MOTIVO: v.motivo },
        v.soporte ? { SOPORTE: v.soporte } : {},
      )
      return toResultados(rows?.rows ?? [])
    },
  )
}

/* ───────────── Documentos PDF (C.1.LOT.7 y 8, Secciones 2.14, 2.17 y 3.6) ───────────── */

async function descargarPdf(path: string, body: unknown, archivo: string) {
  const blob = await api.post<Blob>(`/eval-col${path}`, body, { responseType: "blob" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = archivo
  a.click()
  URL.revokeObjectURL(url)
}

/** Hoja de matrícula (Sección 3.6): un solo PDF con la hoja de cada estudiante. */
export function useGenerarHojas() {
  return useMutation({
    mutationFn: (matriculaIds: string[]) =>
      descargarPdf(
        `${BASE}/hojas`,
        { IDS: ids(matriculaIds) },
        matriculaIds.length === 1 ? "hoja-matricula.pdf" : "hojas-matricula.pdf",
      ),
  })
}

/** Si la constancia lleva numeración (Configuración de Reportes): ofrece generar como borrador. */
export function useConfiguracionConstanciaQuery() {
  return useQuery({
    queryKey: [...matriculaKeys.all, "constancia-configuracion"],
    queryFn: async () => {
      const row = await evalCol.getRow<{ numeracion: boolean }>(`${BASE}/constancias/configuracion`)
      return { numeracion: row.numeracion }
    },
    staleTime: 5 * 60_000,
  })
}

export interface GenerarConstanciasInput {
  matriculaIds: string[]
  dirigidaA: string
  borrador: boolean
}

/** Constancia de estudio (Sección 2.17, Regla 58): un solo PDF, una por estudiante. */
export function useGenerarConstancias() {
  return useMutation({
    mutationFn: (v: GenerarConstanciasInput) =>
      descargarPdf(
        `${BASE}/constancias`,
        { IDS: ids(v.matriculaIds), DIRIGIDA_A: v.dirigidaA, BORRADOR: v.borrador ? "S" : "N" },
        v.matriculaIds.length === 1 ? "constancia-estudio.pdf" : "constancias-estudio.pdf",
      ),
  })
}

/* Paquete de soporte (Regla 73): individual. */

export interface PreviaPaquete {
  documentoIdentidad: boolean
  /** Qué boletín entra (o el certificado del año anterior en Preescolar); null si ninguno. */
  boletin: string | null
  hojaFirmada: boolean
}

export function usePreviaPaqueteQuery(matriculaId: string) {
  return useQuery({
    queryKey: [...matriculaKeys.detalle(matriculaId), "paquete-soporte"],
    queryFn: async (): Promise<PreviaPaquete> => {
      const row = await evalCol.getRow<{ documento_identidad: boolean; boletin: string | null; hoja_firmada: boolean }>(
        `/cobertura-academica/matricula/${matriculaId}/paquete-soporte/previa`,
      )
      return { documentoIdentidad: row.documento_identidad, boletin: row.boletin, hojaFirmada: row.hoja_firmada }
    },
    staleTime: 0,
  })
}

export function useGenerarPaquete() {
  return useMutation({
    mutationFn: (matriculaId: string) =>
      descargarPdf(`/cobertura-academica/matricula/${matriculaId}/paquete-soporte`, {}, "paquete-soporte.pdf"),
  })
}
