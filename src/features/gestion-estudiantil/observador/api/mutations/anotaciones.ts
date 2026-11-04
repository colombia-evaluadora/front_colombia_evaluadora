import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat } from "@/features/establishment/institution/api/types/export"

import { observadorKeys } from "@/features/gestion-estudiantil/observador/api/query-keys"
import type {
  AnotacionActualizarInput,
  AnotacionCrearInput,
  ObservadorQueryFilters,
  TipoImpresion,
} from "@/features/gestion-estudiantil/observador/api/types"

/** Con varios estudiantes el backend crea una anotación por cada uno (Regla 6). */
function crearAnotacion(input: AnotacionCrearInput) {
  return evalCol.postRows<{ id: number }>("/gestion-estudiantil/observador", {
    FK_MATRICULAS: input.matriculas,
    FECHA: input.fecha,
    FK_COMPORTAMIENTO: input.comportamientoId,
    OBSERVACION: input.observacion.trim(),
    PREOCUPA_PERMANENCIA: input.preocupaPermanencia,
    REQUIERE_MEDIACION: input.requiereMediacion,
  })
}

function actualizarAnotacion(input: AnotacionActualizarInput) {
  return evalCol.putRow(`/gestion-estudiantil/observador/${input.id}`, {
    FECHA: input.fecha,
    FK_COMPORTAMIENTO: input.comportamientoId,
    OBSERVACION: input.observacion.trim(),
    PREOCUPA_PERMANENCIA: input.preocupaPermanencia,
  })
}

function anularAnotacion(input: { id: number; motivo: string }) {
  return evalCol.postRow(`/gestion-estudiantil/observador/${input.id}/anular`, {
    MOTIVO: input.motivo.trim(),
  })
}

/** Toda escritura invalida el feature entero: listado, detalle y códigos cuelgan de `observadorKeys.all`. */
function useInvalidarObservador() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: observadorKeys.all })
}

export function useCrearAnotacion({ mutationConfig }: { mutationConfig?: MutationConfig<typeof crearAnotacion> } = {}) {
  const invalidar = useInvalidarObservador()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: crearAnotacion,
    ...rest,
    onSuccess: (...args) => {
      invalidar()
      onSuccess?.(...args)
    },
  })
}

export function useActualizarAnotacion({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof actualizarAnotacion> } = {}) {
  const invalidar = useInvalidarObservador()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: actualizarAnotacion,
    ...rest,
    onSuccess: (...args) => {
      invalidar()
      onSuccess?.(...args)
    },
  })
}

export function useAnularAnotacion({ mutationConfig }: { mutationConfig?: MutationConfig<typeof anularAnotacion> } = {}) {
  const invalidar = useInvalidarObservador()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: anularAnotacion,
    ...rest,
    onSuccess: (...args) => {
      invalidar()
      onSuccess?.(...args)
    },
  })
}

/** Exportar del listado: el mismo `FILTERS` de la tabla, sin paginar (clave `observador-anotaciones`). */
function exportarAnotaciones(input: { filters: ObservadorQueryFilters; format: ExportFormat }) {
  return downloadReport("observador-anotaciones", { format: input.format, filters: input.filters })
}

export function useExportarAnotaciones({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof exportarAnotaciones> } = {}) {
  return useMutation({ mutationFn: exportarAnotaciones, ...mutationConfig })
}

/** Imprimir observador (2.3): el PDF para firmar de un estudiante (clave `observador`). */
function imprimirObservador(input: { matriculaId: number; periodoId: number | null; tipo: TipoImpresion }) {
  return downloadReport("observador", {
    format: "pdf",
    filters: {
      FK_MATRICULA: input.matriculaId,
      FK_PERIODO_EVALUACION: input.periodoId,
      TIPO: input.tipo,
    },
  })
}

export function useImprimirObservador({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof imprimirObservador> } = {}) {
  return useMutation({ mutationFn: imprimirObservador, ...mutationConfig })
}
