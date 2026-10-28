import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { CheckIcon, SpinnerIcon, TrashIcon, UserSwitchIcon, XIcon } from "@/components/ui/icons"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage, isConflictError } from "@/lib/api-client"

import { useDeleteUnidad } from "@/features/planeador/api/mutations/delete-unidad"
import { useUnidadActividadesQuery } from "@/features/planeador/api/query/use-unidad-actividades-query"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { useCederUnidad } from "@/features/planeador/api/mutations/ceder-unidad"
import { useUnidadColegasQuery, type UnidadColega } from "@/features/planeador/api/query/use-unidad-colegas-query"
import { describirUsoColega, resolverCesion } from "@/features/planeador/lib/cesion-unidad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { usePlaneadorSoloLectura } from "@/features/planeador/hooks/use-planeador-solo-lectura"
import {
  articuloDefinido,
  useRotuloUnidad,
} from "@/features/planeador/lib/unidad-instrumento-label"
import {
  ROTULO_ACTIVIDAD_FALLBACK,
  rotuloEnMinuscula,
} from "@/features/planeador/api/query/use-rotulo-actividad-query"
import { pluralizarRotulo, terminacionRotulo } from "@/features/planeador/lib/rotulo-gramatica"

interface DialogDeleteUnidadProps {
  unidad: Pick<UnidadTematica, "id" | "nombre" | "gradoId" | "rotuloEjecucion">
  /** Rótulo de la unidad ya resuelto por el caller (las cards del listado
   *  lo reciben de la página). Sin él, se resuelve acá con `useRotuloUnidad`. */
  rotuloUnidad?: string
  /** Además del toast, el panel reacciona (reselecciona otra unidad en el
   *  rail) cuando el delete (o la cesión) termina OK — la unidad abierta ya
   *  no le pertenece a este docente. */
  onDeleted?: () => void
  /** Se aplica al `Button` del trigger — mismo mecanismo que
   *  `DialogDeleteActividad`, para heredar variante/color/tamaño del
   *  contexto que lo monta. */
  triggerProps?: React.ComponentProps<typeof Button>
}

/**
 * Confirmación de borrado de una unidad temática. Mismo patrón que
 * `DialogDeleteActividad`: trigger con `TrashIcon`, copy explícito ("no se
 * puede deshacer"), botón `destructive` para confirmar, toast en
 * `onSuccess`.
 *
 * Regla 27: si la unidad tiene actividades o criterios de OTROS docentes
 * vinculados, el backend rechaza el borrado con 409
 * (`fn_unidad_validar_eliminable`) y sugiere cederla en vez de eliminarla.
 * Ese caso cambia el contenido del mismo `AlertDialog` a un paso de "ceder"
 * que ofrece SOLO a los colegas que la usan
 * (`GET /planeador/unidades/:id/colegas`, el mismo núcleo que bloquea el
 * borrado): con uno solo, "Se cederá a <Nombre>" y un botón de confirmar;
 * con varios, el dueño elige de la lista. La unidad no se elimina: cambia de
 * dueño y quien cedió deja de administrarla. El backend
 * (`fn_unidad_validar_cesion`) sigue validando al elegido.
 *
 * Reglas 38/39 (dueño solo, sin colegas): si alguna actividad vinculada tiene
 * resultados la eliminación se bloquea (el backend también lo rechaza con
 * 23503 nombrándolas) y el docente debe desvincularlas primero. Sin notas, la
 * confirmación ofrece dos acciones: eliminar solo la unidad (las actividades
 * quedan sin asignar) o eliminarla junto con sus actividades sin notas
 * (`ELIMINAR_ACTIVIDADES`: el backend aplica la misma regla que eliminar una
 * actividad y desvincula las que no puede borrar, p. ej. base de un refuerzo).
 */
export function DialogDeleteUnidad({ unidad, rotuloUnidad, onDeleted, triggerProps }: DialogDeleteUnidadProps) {
  const [open, setOpen] = useState(false)
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)
  const [colegaElegido, setColegaElegido] = useState<number | null>(null)
  const { notify } = useNotify()

  // Rótulo real de la pestaña de ESTA unidad ("Unidad temática"/"Proyecto
  // pedagógico"/…), por su referente real (`useRotuloUnidad`) salvo que el
  // caller ya lo haya resuelto — nunca "unidad temática" fijo. Ojo:
  // `unidad.instrumento` es un campo homónimo pero DISTINTO (Instrumento de
  // evaluación: Rúbrica/Lista de cotejo/Escala), no sirve acá.
  const instrumentoLabel = useRotuloUnidad(unidad, rotuloUnidad)
  const instrumentoLower = rotuloEnMinuscula(instrumentoLabel)
  const articulo = articuloDefinido(instrumentoLabel)
  // Concordancia de género del rótulo: "cederlo/cederla", "suyo/suya".
  const o = articulo === "el" ? "o" : "a"
  // Rótulo de la actividad (Regla 13) para "sus criterios y actividades
  // vinculadas" — en plural concordado (`pluralizarRotulo`).
  const rotuloActividad = unidad.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK
  const actividadLower = rotuloEnMinuscula(rotuloActividad)
  const actividadesLower = pluralizarRotulo(actividadLower)
  const vinculadas = `vinculad${terminacionRotulo(rotuloActividad)}s`
  const articuloActividades = terminacionRotulo(rotuloActividad) === "o" ? "los" : "las"
  const laUnidad = `${articulo === "el" ? "el" : "la"} ${instrumentoLower}`

  // Solo con el diálogo abierto: decide la pregunta (hay actividades o no) y
  // el bloqueo preventivo por resultados.
  const { data: actividadesVinculadas, isPending: isPendingActividades } = useUnidadActividadesQuery(
    open ? unidad.id : undefined,
  )
  const actividadesConResultados = (actividadesVinculadas ?? []).filter((a) => a.tieneResultados)
  // El 409 del backend también puede ser por resultados (lista vieja en caché):
  // ahí la cesión no aplica, solo se muestra el motivo.
  const conflictoPorResultados = conflictMessage != null && /resultados registrados/i.test(conflictMessage)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setConflictMessage(null)
      setColegaElegido(null)
    }
  }

  const deleteMutation = useDeleteUnidad({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(`${instrumentoLabel} eliminad${o} correctamente.`)
        handleOpenChange(false)
        onDeleted?.()
      },
      onError: (error) => {
        if (isConflictError(error)) {
          setConflictMessage(getErrorMessage(error))
          return
        }
        notify(`No se pudo eliminar ${articulo === "el" ? "el" : "la"} ${instrumentoLower}.`, { variant: "error" })
      },
    },
  })

  const cederMutation = useCederUnidad({
    mutationConfig: {
      onSuccess: (_data, variables) => {
        const nombre = colegasQuery.data?.find((c) => c.funcionarioId === variables.nuevoFuncionarioId)?.nombre
        notify(`${instrumentoLabel} cedid${o} correctamente${nombre ? ` a ${nombre}` : ""}.`)
        handleOpenChange(false)
        onDeleted?.()
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  // Solo se consulta en el paso "ceder" (tras el 409): es la foto de quién
  // usa la unidad en ese momento.
  const colegasQuery = useUnidadColegasQuery(unidad.id, { enabled: open && conflictMessage != null && !conflictoPorResultados })
  const cesion = colegasQuery.data ? resolverCesion(colegasQuery.data) : null
  const destino: UnidadColega | null =
    cesion?.modo === "automatica"
      ? cesion.colega
      : cesion?.modo === "elegir"
        ? (cesion.colegas.find((c) => c.funcionarioId === colegaElegido) ?? null)
        : null
  const usoDe = (colega: UnidadColega) =>
    describirUsoColega(colega, { singular: actividadLower, plural: actividadesLower })

  function ceder() {
    if (destino?.funcionarioId == null) return
    cederMutation.mutate({ unidadId: unidad.id, nuevoFuncionarioId: destino.funcionarioId })
  }

  const tieneActividades = (actividadesVinculadas?.length ?? 0) > 0
  const bloqueadaPorResultados = conflictoPorResultados || actividadesConResultados.length > 0

  const { puedeEliminar } = usePlaneadorSoloLectura()
  // Fase 1 offline es solo lectura: eliminar/ceder necesitan red.
  const soloEnLinea = useOnlineOnly()
  if (!puedeEliminar) return null

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`Eliminar ${unidad.nombre}`}
                  {...triggerProps}
                  disabled={soloEnLinea.disabled || triggerProps?.disabled}
                />
              }
            />
          }
        >
          <TrashIcon />
        </TooltipTrigger>
        <TooltipContent>{soloEnLinea.tooltip ?? `Eliminar ${unidad.nombre}`}</TooltipContent>
      </Tooltip>
      <AlertDialogContent className={conflictMessage ? "sm:max-w-lg" : undefined}>
        {conflictMessage && !conflictoPorResultados ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                No se puede eliminar {articulo} {instrumentoLower}
              </AlertDialogTitle>
              <AlertDialogDescription render={<div className="flex flex-col gap-3 text-left" />}>
                <div className="border-red-stroke bg-red-22 text-red rounded-md border p-3 text-sm">
                  {conflictMessage}
                </div>
                {colegasQuery.isPending ? (
                  <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
                    <SpinnerIcon className="size-4 animate-spin" />
                    Buscando a los docentes que l{o} usan...
                  </p>
                ) : colegasQuery.isError ? (
                  <span className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-red">{getErrorMessage(colegasQuery.error)}</span>
                    <Button
                      type="button"
                      variant="outline"
                      color="neutral"
                      size="sm"
                      onClick={() => colegasQuery.refetch()}
                    >
                      Reintentar
                    </Button>
                  </span>
                ) : cesion?.modo === "automatica" ? (
                  <span className="text-foreground text-sm">
                    Se cederá a <strong>{cesion.colega.nombre}</strong>
                    {usoDe(cesion.colega) && (
                      <span className="text-muted-foreground"> ({usoDe(cesion.colega)})</span>
                    )}
                    . {articulo === "el" ? "El" : "La"} {instrumentoLower} no se elimina: pasa a ser suy{o} y usted
                    deja de administrarl{o}.
                  </span>
                ) : cesion?.modo === "elegir" ? (
                  <span className="flex flex-col gap-2">
                    <span id={`ceder-a-${unidad.id}`} className="text-foreground text-sm">
                      Elija a quién cederl{o}. No se elimina: pasa a ser de esa persona y usted deja de
                      administrarl{o}.
                    </span>
                    <RadioGroup
                      aria-labelledby={`ceder-a-${unidad.id}`}
                      value={colegaElegido}
                      onValueChange={(value) => setColegaElegido(value as number)}
                      disabled={cederMutation.isPending}
                      className="max-h-56 gap-1 overflow-y-auto"
                    >
                      {cesion.colegas.map((colega) => (
                        <label
                          key={colega.funcionarioId}
                          className="hover:bg-muted/50 has-data-checked:border-primary flex cursor-pointer items-center gap-3 rounded-md border p-2 text-sm"
                        >
                          <RadioGroupItem value={colega.funcionarioId} />
                          <span className="flex min-w-0 flex-col">
                            <span className="text-foreground truncate font-medium">{colega.nombre}</span>
                            {usoDe(colega) && <span className="text-muted-foreground text-xs">{usoDe(colega)}</span>}
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    No hay ningún docente a quien cederl{o}. Si ya nadie más l{o} usa, vuelva a intentar
                    eliminarl{o}.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {cesion?.modo === "sin-colegas" ? (
                <Button
                  type="button"
                  color="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    setConflictMessage(null)
                    deleteMutation.mutate({ id: unidad.id })
                  }}
                >
                  <TrashIcon data-icon="inline-start" />
                  Eliminar
                </Button>
              ) : cesion ? (
                <Button
                  type="button"
                  disabled={destino == null || cederMutation.isPending}
                  aria-busy={cederMutation.isPending}
                  onClick={ceder}
                >
                  {cederMutation.isPending ? (
                    <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <UserSwitchIcon data-icon="inline-start" />
                  )}
                  {cesion.modo === "automatica" ? "Confirmar y ceder" : "Ceder"}
                </Button>
              ) : null}
              <AlertDialogCancel variant="fill" color="neutral" disabled={cederMutation.isPending}>
                <XIcon data-icon="inline-start" />
                Cerrar
              </AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : bloqueadaPorResultados ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>No se puede eliminar {laUnidad}</AlertDialogTitle>
              <AlertDialogDescription render={<div className="flex flex-col gap-3 text-left" />}>
                <div className="border-red-stroke bg-red-22 text-red rounded-md border p-3 text-sm">
                  {conflictoPorResultados
                    ? conflictMessage
                    : `${articuloActividades === "los" ? "Estos" : "Estas"} ${actividadesLower} ${vinculadas} tienen resultados registrados: ${actividadesConResultados
                        .map((a) => `“${a.nombre}”`)
                        .join(", ")}. Desvincúlel${articuloActividades === "los" ? "o" : "a"}s primero para poder eliminar ${laUnidad}.`}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="fill" color="neutral">
                <XIcon data-icon="inline-start" />
                Cerrar
              </AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar {instrumentoLower}</AlertDialogTitle>
              <AlertDialogDescription>
                {tieneActividades ? (
                  <>
                    ¿Desea eliminar únicamente {laUnidad} ({articuloActividades} {actividadesLower} quedarán sin
                    asignar) o eliminar {laUnidad} junto con todas sus {actividadesLower} sin notas? Esta acción
                    no se puede deshacer.
                  </>
                ) : (
                  <>
                    Se eliminará permanentemente {laUnidad} &ldquo;{unidad.nombre}&rdquo; junto con sus
                    criterios. Esta acción no se puede deshacer.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {tieneActividades ? (
                <>
                  <AlertDialogAction
                    color="destructive"
                    variant="outline"
                    disabled={deleteMutation.isPending}
                    aria-busy={deleteMutation.isPending && !deleteMutation.variables?.eliminarActividades}
                    onClick={() => deleteMutation.mutate({ id: unidad.id, eliminarActividades: false })}
                  >
                    {deleteMutation.isPending && !deleteMutation.variables?.eliminarActividades ? (
                      <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <TrashIcon data-icon="inline-start" />
                    )}
                    Eliminar solo {laUnidad}
                  </AlertDialogAction>
                  <AlertDialogAction
                    color="destructive"
                    disabled={deleteMutation.isPending}
                    aria-busy={deleteMutation.isPending && deleteMutation.variables?.eliminarActividades}
                    onClick={() => deleteMutation.mutate({ id: unidad.id, eliminarActividades: true })}
                  >
                    {deleteMutation.isPending && deleteMutation.variables?.eliminarActividades ? (
                      <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <TrashIcon data-icon="inline-start" />
                    )}
                    Eliminar con sus {actividadesLower}
                  </AlertDialogAction>
                </>
              ) : (
                <AlertDialogAction
                  color="destructive"
                  disabled={deleteMutation.isPending || isPendingActividades}
                  aria-busy={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ id: unidad.id })}
                >
                  {deleteMutation.isPending ? (
                    <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <CheckIcon data-icon="inline-start" />
                  )}
                  Si
                </AlertDialogAction>
              )}
              <AlertDialogCancel variant="fill" color="neutral" disabled={deleteMutation.isPending}>
                <XIcon data-icon="inline-start" />
                {tieneActividades ? "Cancelar" : "No"}
              </AlertDialogCancel>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
