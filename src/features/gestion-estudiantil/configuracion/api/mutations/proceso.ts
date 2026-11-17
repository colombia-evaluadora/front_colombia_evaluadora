import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { convivenciaKeys, procesosKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"
import { configuracionKeys } from "@/features/gestion-estudiantil/configuracion/api/query-keys"
import { BASE_PROCESO } from "@/features/gestion-estudiantil/configuracion/api/query/use-proceso-query"
import type { ClasificacionInput, SancionInput } from "@/features/gestion-estudiantil/configuracion/api/types"

/** Toda escritura refresca los catálogos y las opciones que usan los procesos de Convivencia. */
function useEscritura<T>(fn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configuracionKeys.proceso })
      queryClient.invalidateQueries({ queryKey: convivenciaKeys.all })
      queryClient.invalidateQueries({ queryKey: procesosKeys.all })
    },
  })
}

export type Catalogo = "clasificaciones" | "sanciones"

export const useGuardarPlazos = () =>
  useEscritura((i: { establecimiento: number; descargos: number; recursos: number }) =>
    evalCol.putRow(`${BASE_PROCESO}/plazos`, {
      FK_ESTABLECIMIENTO: i.establecimiento,
      DIAS_DESCARGOS: i.descargos,
      DIAS_RECURSOS: i.recursos,
    }),
  )

const cuerpoClasificacion = (i: ClasificacionInput) => ({ NOMBRE: i.nombre, DESCRIPCION: i.descripcion })
const cuerpoSancion = (i: SancionInput) => ({
  NOMBRE: i.nombre,
  DESCRIPCION: i.descripcion,
  FK_INSTANCIA: i.instancia,
  TIENE_DURACION: i.tieneDuracion,
  FK_EFECTO: i.efecto,
})

export const useCrearClasificacion = () =>
  useEscritura((i: ClasificacionInput & { establecimiento: number }) =>
    evalCol.postRow(`${BASE_PROCESO}/clasificaciones`, {
      ...cuerpoClasificacion(i),
      FK_ESTABLECIMIENTO: i.establecimiento,
      HABILITADO: i.habilitado,
    }),
  )

export const useActualizarClasificacion = () =>
  useEscritura((i: ClasificacionInput & { id: number }) =>
    evalCol.putRow(`${BASE_PROCESO}/clasificaciones/${i.id}`, cuerpoClasificacion(i)),
  )

export const useCrearSancion = () =>
  useEscritura((i: SancionInput & { establecimiento: number }) =>
    evalCol.postRow(`${BASE_PROCESO}/sanciones`, { ...cuerpoSancion(i), FK_ESTABLECIMIENTO: i.establecimiento, HABILITADO: i.habilitado }),
  )

export const useActualizarSancion = () =>
  useEscritura((i: SancionInput & { id: number }) => evalCol.putRow(`${BASE_PROCESO}/sanciones/${i.id}`, cuerpoSancion(i)))

/** `PATCH .../:ID/estado` de cualquiera de los dos catálogos. */
export const useCambiarEstadoProceso = () =>
  useEscritura((i: { catalogo: Catalogo; id: number; habilitado: boolean }) =>
    evalCol.patchRow(`${BASE_PROCESO}/${i.catalogo}/${i.id}/estado`, { HABILITADO: i.habilitado }),
  )

/** `PATCH .../:ID/eliminar`: el backend bloquea lo que ya se usó (Regla 4). */
export const useEliminarProceso = () =>
  useEscritura((i: { catalogo: Catalogo; id: number }) => evalCol.patchRow(`${BASE_PROCESO}/${i.catalogo}/${i.id}/eliminar`, {}))
