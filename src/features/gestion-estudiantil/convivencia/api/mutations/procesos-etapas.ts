import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { subirSoporteConvivencia } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import { convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import type { ResultadoEtapa, SancionBody } from "@/features/gestion-estudiantil/convivencia/api/procesos-etapas-types"

const BASE = "/gestion-estudiantil/convivencia/procesos"

/** El resultado puede venir envuelto en `{ resultado }` (como en la apertura) o suelto en la fila. */
const resultadoDe = (fila: unknown): ResultadoEtapa => {
  const f = (fila ?? {}) as { resultado?: ResultadoEtapa } & ResultadoEtapa
  return f.resultado ?? f
}

/** Mutación de etapa: tras el éxito invalida todo Convivencia (el listado y el detalle cuelgan de `convivenciaKeys.all`). */
function useMutacionEtapa<I>(mutationFn: (i: I) => Promise<ResultadoEtapa>, mutationConfig?: MutationConfig<typeof mutationFn>) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: convivenciaKeys.all })
      onSuccess?.(...args)
    },
  })
}

type Config<I> = { mutationConfig?: MutationConfig<(i: I) => Promise<ResultadoEtapa>> }

export interface DescargosInput {
  procesoId: number
  presento: boolean
  fechaDiligencia: string
  acudientePresente: boolean | null
  version: string
  otrosAsistentes: string
  pruebas: { descripcion: string; archivo: File | null }[]
  acta: File | null
  constancia: string
}

/** `POST /procesos/:ID/descargos` (§4.1): sube antes las pruebas y el acta. */
async function registrarDescargos(i: DescargosInput) {
  if (!i.presento) {
    return resultadoDe(await evalCol.postRow(`${BASE}/${i.procesoId}/descargos`, { PRESENTO: false, CONSTANCIA: i.constancia.trim() }))
  }
  const [pruebas, acta] = await Promise.all([
    Promise.all(
      i.pruebas.map(async (p) => ({
        descripcion: p.descripcion.trim(),
        fk_archivo: p.archivo ? await subirSoporteConvivencia(p.archivo) : null,
      })),
    ),
    i.acta ? subirSoporteConvivencia(i.acta) : Promise.resolve(null),
  ])
  return resultadoDe(
    await evalCol.postRow(`${BASE}/${i.procesoId}/descargos`, {
      PRESENTO: true,
      FECHA_DILIGENCIA: i.fechaDiligencia,
      ACUDIENTE_PRESENTE: i.acudientePresente,
      VERSION: i.version.trim(),
      OTROS_ASISTENTES: i.otrosAsistentes.trim() || null,
      PRUEBAS: pruebas.length ? pruebas : null,
      FK_ARCHIVO_ACTA: acta,
    }),
  )
}

export const useRegistrarDescargos = ({ mutationConfig }: Config<DescargosInput> = {}) =>
  useMutacionEtapa(registrarDescargos, mutationConfig)

export interface DecisionInput {
  procesoId: number
  fecha: string
  instancia: number
  resultado: number
  /** Solo al sancionar. */
  cargosProbados: number[] | null
  motivacion: string
  sanciones: SancionBody[] | null
  acto: File
}

/** `POST /procesos/:ID/decision` (§4.2). */
async function registrarDecision(i: DecisionInput) {
  const acto = await subirSoporteConvivencia(i.acto)
  return resultadoDe(
    await evalCol.postRow(`${BASE}/${i.procesoId}/decision`, {
      FECHA: i.fecha,
      FK_INSTANCIA: i.instancia,
      FK_RESULTADO: i.resultado,
      CARGOS_PROBADOS: i.cargosProbados,
      MOTIVACION: i.motivacion.trim(),
      SANCIONES: i.sanciones,
      FK_ARCHIVO_ACTO: acto,
    }),
  )
}

export const useRegistrarDecision = ({ mutationConfig }: Config<DecisionInput> = {}) =>
  useMutacionEtapa(registrarDecision, mutationConfig)

export interface NotificacionInput {
  procesoId: number
  fecha: string
  soporte: File
}

/** `POST /procesos/:ID/notificacion` (§4.3). */
async function registrarNotificacion(i: NotificacionInput) {
  const soporte = await subirSoporteConvivencia(i.soporte)
  return resultadoDe(
    await evalCol.postRow(`${BASE}/${i.procesoId}/notificacion`, { FECHA_NOTIFICACION: i.fecha, FK_ARCHIVO_SOPORTE: soporte }),
  )
}

export const useRegistrarNotificacion = ({ mutationConfig }: Config<NotificacionInput> = {}) =>
  useMutacionEtapa(registrarNotificacion, mutationConfig)

export interface RecursoInput {
  procesoId: number
  tipo: number
  fecha: string
  presentacion: number
  argumentos: string
  escrito: File
  instancia: number
}

/** `POST /procesos/:ID/recursos` (§4.4). */
async function registrarRecurso(i: RecursoInput) {
  const escrito = await subirSoporteConvivencia(i.escrito)
  return resultadoDe(
    await evalCol.postRow(`${BASE}/${i.procesoId}/recursos`, {
      FK_TIPO: i.tipo,
      FECHA_PRESENTACION: i.fecha,
      FK_PRESENTACION: i.presentacion,
      ARGUMENTOS: i.argumentos.trim(),
      FK_ARCHIVO_ESCRITO: escrito,
      FK_INSTANCIA_RESUELVE: i.instancia,
    }),
  )
}

export const useRegistrarRecurso = ({ mutationConfig }: Config<RecursoInput> = {}) =>
  useMutacionEtapa(registrarRecurso, mutationConfig)

export interface ResolucionInput {
  recursoId: number
  fecha: string
  resultado: number
  motivacion: string
  /** Obligatorio con Modifica. */
  sanciones: SancionBody[] | null
  acto: File
}

/** `POST /procesos/recursos/:ID/resolucion` (§4.5). */
async function resolverRecurso(i: ResolucionInput) {
  const acto = await subirSoporteConvivencia(i.acto)
  return resultadoDe(
    await evalCol.postRow(`${BASE}/recursos/${i.recursoId}/resolucion`, {
      FECHA: i.fecha,
      FK_RESULTADO: i.resultado,
      MOTIVACION: i.motivacion.trim(),
      SANCIONES: i.sanciones,
      FK_ARCHIVO_ACTO: acto,
    }),
  )
}

export const useResolverRecurso = ({ mutationConfig }: Config<ResolucionInput> = {}) =>
  useMutacionEtapa(resolverRecurso, mutationConfig)

export interface CumplimientoInput {
  sancionId: number
  resultado: "CUMPLIDA" | "NO_CUMPLIDA"
  observacion: string
}

/** `PATCH /procesos/sanciones/:ID/cumplimiento` (§5.1). */
const registrarCumplimiento = async (i: CumplimientoInput) =>
  resultadoDe(
    await evalCol.patchRow(`${BASE}/sanciones/${i.sancionId}/cumplimiento`, {
      RESULTADO: i.resultado,
      OBSERVACION: i.observacion.trim(),
    }),
  )

export const useRegistrarCumplimiento = ({ mutationConfig }: Config<CumplimientoInput> = {}) =>
  useMutacionEtapa(registrarCumplimiento, mutationConfig)

export interface AjusteFechasInput {
  sancionId: number
  inicio: string
  fin: string
}

/** `PATCH /procesos/sanciones/:ID/fechas` (§5.2). */
const ajustarFechas = async (i: AjusteFechasInput) =>
  resultadoDe(await evalCol.patchRow(`${BASE}/sanciones/${i.sancionId}/fechas`, { FECHA_INICIO: i.inicio, FECHA_FIN: i.fin }))

export const useAjustarFechas = ({ mutationConfig }: Config<AjusteFechasInput> = {}) =>
  useMutacionEtapa(ajustarFechas, mutationConfig)
