import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { CheckIcon, MagnifyingGlassIcon, SpinnerIcon, TrashIcon, UserSwitchIcon, XIcon } from "@/components/ui/icons"
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage, isConflictError } from "@/lib/api-client"

import { useDeleteUnidad } from "@/features/planeador/api/mutations/delete-unidad"
import { useUnidadActividadesQuery } from "@/features/planeador/api/query/use-unidad-actividades-query"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { useCederUnidad } from "@/features/planeador/api/mutations/ceder-unidad"
import { useUnidadColegasQuery, type UnidadColega } from "@/features/planeador/api/query/use-unidad-colegas-query"
import {
  actividadesAjenasSinCesion,
  describirUsoColega,
  filtrarColegas,
  resolverCesion,
} from "@/features/planeador/lib/cesion-unidad"
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
 * Al abrir consulta a los colegas que usan la unidad
 * (`GET /planeador/unidades/:id/colegas`, el mismo núcleo con el que el
 * backend decide si se puede eliminar) y decide el paso:
 *
 * - Regla 27, hay cesionarios válidos (colegas con funcionario activo): la
 *   unidad no se elimina, se CEDE. Con uno solo, "Se cederá a <Nombre>" y un
 *   botón de confirmar; con varios, el dueño elige de la lista, que tiene un
 *   buscador por nombre o documento (filtrado local: son solo los colegas de
 *   UNA unidad). La unidad cambia de dueño y quien cedió deja de
 *   administrarla; el backend (`fn_unidad_validar_cesion`) valida al elegido.
 * - Sin cesionarios (nadie, o solo autores que no son funcionarios activos,
 *   p. ej. carga masiva): la cesión no aplica y se sigue el flujo del dueño
 *   solo (Reglas 38/39). Si alguna actividad vinculada tiene resultados se
 *   bloquea ("desvincúlelas primero"); si no, se pregunta si eliminar solo la
 *   unidad (las actividades quedan sin asignar) o junto con sus actividades
 *   sin notas (`ELIMINAR_ACTIVIDADES`: el backend aplica la regla de eliminar
 *   actividad y desvincula las que no puede borrar). Las actividades de otros
 *   autores SIEMPRE se desvinculan: nunca se borra trabajo ajeno.
 * - Si la consulta de colegas falla (p. ej. 404 porque el endpoint no está
 *   publicado) NO se asume "sin colegas": se muestra el error y no se permite
 *   eliminar.
 *
 * Si aun así el backend responde 409 (la foto cambió entre abrir y
 * confirmar), se muestra su mensaje y se vuelve a consultar a los colegas.
 */
export function DialogDeleteUnidad({ unidad, rotuloUnidad, onDeleted, triggerProps }: DialogDeleteUnidadProps) {
  const [open, setOpen] = useState(false)
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)
  const [colegaElegido, setColegaElegido] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState("")
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
  const LaUnidad = `${articulo === "el" ? "El" : "La"} ${instrumentoLower}`

  // Solo con el diálogo abierto: decide la pregunta (hay actividades o no) y
  // el bloqueo preventivo por resultados.
  const { data: actividadesVinculadas, isPending: isPendingActividades } = useUnidadActividadesQuery(
    open ? unidad.id : undefined,
  )
  const actividadesConResultados = (actividadesVinculadas ?? []).filter((a) => a.tieneResultados)
  // El 409 del backend también puede ser por resultados (lista vieja en caché):
  // ahí la cesión no aplica, solo se muestra el motivo.
  const conflictoPorResultados = conflictMessage != null && /resultados registrados/i.test(conflictMessage)

  // Quién usa la unidad ahora (sin caché). Decide entre ceder y eliminar.
  const colegasQuery = useUnidadColegasQuery(unidad.id, { enabled: open })
  const cesion = colegasQuery.data ? resolverCesion(colegasQuery.data) : null
  const hayCesionarios = cesion != null && cesion.modo !== "sin-colegas"
  const ajenasSinCesion = colegasQuery.data ? actividadesAjenasSinCesion(colegasQuery.data) : 0
  const colegasVisibles = cesion?.modo === "elegir" ? filtrarColegas(cesion.colegas, busqueda) : []
  const destino: UnidadColega | null =
    cesion?.modo === "automatica"
      ? cesion.colega
      : cesion?.modo === "elegir"
        ? (cesion.colegas.find((c) => c.funcionarioId === colegaElegido) ?? null)
        : null
  const usoDe = (colega: UnidadColega) =>
    describirUsoColega(colega, { singular: actividadLower, plural: actividadesLower })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setConflictMessage(null)
      setColegaElegido(null)
      setBusqueda("")
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
          // La foto de colegas pudo cambiar: si apareció un cesionario, el
          // diálogo pasa al paso "ceder".
          void colegasQuery.refetch()
          return
        }
        notify(`No se pudo eliminar ${laUnidad}.`, { variant: "error" })
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

  const cerrar = (label = "Cerrar", disabled = false) => (
    <AlertDialogCancel variant="fill" color="neutral" disabled={disabled}>
      <XIcon data-icon="inline-start" />
      {label}
    </AlertDialogCancel>
  )

  let contenido: React.ReactNode
  if (colegasQuery.isPending) {
    contenido = (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar {instrumentoLower}</AlertDialogTitle>
          <AlertDialogDescription render={<div />}>
            <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
              <SpinnerIcon className="size-4 animate-spin" />
              Verificando si otros docentes usan {laUnidad}...
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>{cerrar("Cancelar")}</AlertDialogFooter>
      </>
    )
  } else if (colegasQuery.isError) {
    // Nunca se interpreta como "sin colegas": eliminar podría dejar sin
    // ofrecer la cesión o chocar con el 409. Solo reintentar o cerrar.
    contenido = (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle>No se puede eliminar {laUnidad} por ahora</AlertDialogTitle>
          <AlertDialogDescription render={<div className="flex flex-col gap-3 text-left" />}>
            <div className="border-red-stroke bg-red-22 text-red rounded-md border p-3 text-sm" role="alert">
              No se pudo verificar si otros docentes usan {laUnidad}: {getErrorMessage(colegasQuery.error)}
            </div>
            <span className="text-muted-foreground text-sm">
              Intente de nuevo. Si el problema persiste, comuníquese con soporte.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            color="neutral"
            disabled={colegasQuery.isFetching}
            onClick={() => colegasQuery.refetch()}
          >
            {colegasQuery.isFetching && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            Reintentar
          </Button>
          {cerrar()}
        </AlertDialogFooter>
      </>
    )
  } else if (hayCesionarios && !conflictoPorResultados) {
    contenido = (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle>
            No se puede eliminar {articulo} {instrumentoLower}
          </AlertDialogTitle>
          <AlertDialogDescription render={<div className="flex flex-col gap-3 text-left" />}>
            <div className="border-red-stroke bg-red-22 text-red rounded-md border p-3 text-sm">
              {conflictMessage ??
                `Otros docentes tienen ${actividadesLower} o criterios propios en ${laUnidad}. En lugar de eliminarl${o}, cédal${o} a uno de ellos.`}
            </div>
            {cesion?.modo === "automatica" ? (
              <span className="text-foreground text-sm">
                Se cederá a <strong>{cesion.colega.nombre}</strong>
                {usoDe(cesion.colega) && <span className="text-muted-foreground"> ({usoDe(cesion.colega)})</span>}.{" "}
                {LaUnidad} no se elimina: pasa a ser suy{o} y usted deja de administrarl{o}.
              </span>
            ) : cesion?.modo === "elegir" ? (
              <span className="flex flex-col gap-2">
                <span id={`ceder-a-${unidad.id}`} className="text-foreground text-sm">
                  Elija a quién cederl{o}. No se elimina: pasa a ser de esa persona y usted deja de administrarl
                  {o}.
                </span>
                <InputGroup className="h-10 rounded-md border border-input px-1 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
                  <InputGroupAddon>
                    <MagnifyingGlassIcon />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="search"
                    value={busqueda}
                    maxLength={100}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o documento"
                    aria-label="Buscar docente por nombre o documento"
                    disabled={cederMutation.isPending}
                  />
                </InputGroup>
                {colegasVisibles.length === 0 ? (
                  <span className="text-muted-foreground px-1 text-sm" role="status">
                    Ningún docente coincide con &ldquo;{busqueda.trim()}&rdquo;.
                  </span>
                ) : (
                  <RadioGroup
                    aria-labelledby={`ceder-a-${unidad.id}`}
                    value={colegaElegido}
                    onValueChange={(value) => setColegaElegido(value as number)}
                    disabled={cederMutation.isPending}
                    className="max-h-56 gap-1 overflow-y-auto"
                  >
                    {colegasVisibles.map((colega) => (
                      <label
                        key={colega.funcionarioId}
                        className="hover:bg-muted/50 has-data-checked:border-primary flex cursor-pointer items-center gap-3 rounded-md border p-2 text-sm"
                      >
                        <RadioGroupItem value={colega.funcionarioId} />
                        <span className="flex min-w-0 flex-col">
                          <span className="text-foreground truncate font-medium">{colega.nombre}</span>
                          <span className="text-muted-foreground text-xs">
                            {[colega.identificacion && `Doc. ${colega.identificacion}`, usoDe(colega)]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                )}
                {destino && !colegasVisibles.includes(destino) && (
                  <span className="text-muted-foreground px-1 text-xs">
                    Seleccionado: <strong className="text-foreground">{destino.nombre}</strong>
                  </span>
                )}
              </span>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
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
            {cesion?.modo === "automatica" ? "Confirmar y ceder" : "Ceder"}
          </Button>
          {cerrar("Cerrar", cederMutation.isPending)}
        </AlertDialogFooter>
      </>
    )
  } else if (bloqueadaPorResultados) {
    contenido = (
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
        <AlertDialogFooter>{cerrar()}</AlertDialogFooter>
      </>
    )
  } else if (conflictMessage) {
    // 409 que no es por resultados y sin cesionarios tras reconsultar: se
    // muestra el motivo del backend tal cual, sin reintentar a ciegas.
    contenido = (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle>No se puede eliminar {laUnidad}</AlertDialogTitle>
          <AlertDialogDescription render={<div className="flex flex-col gap-3 text-left" />}>
            <div className="border-red-stroke bg-red-22 text-red rounded-md border p-3 text-sm">{conflictMessage}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>{cerrar()}</AlertDialogFooter>
      </>
    )
  } else {
    const notaAjenas =
      ajenasSinCesion > 0
        ? ` ${ajenasSinCesion === 1 ? `Hay 1 ${actividadLower}` : `Hay ${ajenasSinCesion} ${actividadesLower}`} de otros autores sin docente activo a quien cederl${o}: ${ajenasSinCesion === 1 ? "queda" : "quedan"} sin asignar, no se ${ajenasSinCesion === 1 ? "elimina" : "eliminan"}.`
        : ""
    contenido = (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar {instrumentoLower}</AlertDialogTitle>
          <AlertDialogDescription>
            {tieneActividades ? (
              <>
                ¿Desea eliminar únicamente {laUnidad} ({articuloActividades} {actividadesLower} quedarán sin asignar) o
                eliminar {laUnidad} junto con todas sus {actividadesLower} sin notas? Esta acción no se puede
                deshacer.{notaAjenas}
              </>
            ) : (
              <>
                Se eliminará permanentemente {laUnidad} &ldquo;{unidad.nombre}&rdquo; junto con sus criterios. Esta
                acción no se puede deshacer.
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
          {cerrar(tieneActividades ? "Cancelar" : "No", deleteMutation.isPending)}
        </AlertDialogFooter>
      </>
    )
  }

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
      <AlertDialogContent className={hayCesionarios || conflictMessage || tieneActividades ? "sm:max-w-lg" : undefined}>
        {contenido}
      </AlertDialogContent>
    </AlertDialog>
  )
}
