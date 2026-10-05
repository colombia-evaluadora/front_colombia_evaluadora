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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage, isConflictError } from "@/lib/api-client"

import { useDeleteUnidad } from "@/features/planeador/api/mutations/delete-unidad"
import { useCederUnidad } from "@/features/planeador/api/mutations/ceder-unidad"
import { useEmployeesQuery } from "@/features/establishment/employees/api/query/use-employees"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
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
 * Ese caso cambia el contenido del mismo `AlertDialog` a un paso de "ceder
 * unidad": muestra el mensaje real del backend (ya trae los nombres de los
 * docentes involucrados) y un buscador de funcionario para elegir el nuevo
 * dueño. El backend (`fn_unidad_validar_cesion`) es quien valida que el
 * elegido sea apto (ya usa la unidad o dicta su grado+asignatura) — acá no
 * se replica esa regla, solo se muestra su error si el elegido no califica.
 */
export function DialogDeleteUnidad({ unidad, rotuloUnidad, onDeleted, triggerProps }: DialogDeleteUnidadProps) {
  const [open, setOpen] = useState(false)
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)
  const [cederSearch, setCederSearch] = useState("")
  const { notify } = useNotify()

  // Rótulo real de la pestaña de ESTA unidad ("Unidad temática"/"Proyecto
  // pedagógico"/…), por su referente real (`useRotuloUnidad`) salvo que el
  // caller ya lo haya resuelto — nunca "unidad temática" fijo. Ojo:
  // `unidad.instrumento` es un campo homónimo pero DISTINTO (Instrumento de
  // evaluación: Rúbrica/Lista de cotejo/Escala), no sirve acá.
  const instrumentoLabel = useRotuloUnidad(unidad, rotuloUnidad)
  const instrumentoLower = rotuloEnMinuscula(instrumentoLabel)
  const articulo = articuloDefinido(instrumentoLabel)
  // Rótulo de la actividad (Regla 13) para "sus criterios y actividades
  // vinculadas" — en plural concordado (`pluralizarRotulo`).
  const rotuloActividad = unidad.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK
  const actividadesLower = pluralizarRotulo(rotuloEnMinuscula(rotuloActividad))
  const vinculadas = `vinculad${terminacionRotulo(rotuloActividad)}s`

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setConflictMessage(null)
      setCederSearch("")
    }
  }

  const deleteMutation = useDeleteUnidad({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(`${instrumentoLabel} eliminad${articulo === "el" ? "o" : "a"} correctamente.`)
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
      onSuccess: () => {
        notify(`${instrumentoLabel} cedid${articulo === "el" ? "o" : "a"} correctamente.`)
        handleOpenChange(false)
        onDeleted?.()
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  // Solo se consulta una vez que hay 409 (nadie busca un funcionario antes
  // de llegar a este paso) — mismo criterio de "enabled" condicional que el
  // resto del feature. Tamaño de página chico: es un picker, no un listado.
  const { data: funcionarios } = useEmployeesQuery({
    filters: { search: cederSearch },
    sorting: [],
    pageIndex: 0,
    pageSize: 8,
  })

  const { puedeEliminar } = useMenuPermission("PLANEADOR")
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
                />
              }
            />
          }
        >
          <TrashIcon />
        </TooltipTrigger>
        <TooltipContent>{`Eliminar ${unidad.nombre}`}</TooltipContent>
      </Tooltip>
      <AlertDialogContent className={conflictMessage ? "sm:max-w-lg" : undefined}>
        {conflictMessage ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                No se puede eliminar {articulo} {instrumentoLower}
              </AlertDialogTitle>
              <AlertDialogDescription render={<div className="flex flex-col gap-3 text-left" />}>
                <div className="border-red-stroke bg-red-22 text-red rounded-md border p-3 text-sm">
                  {conflictMessage}
                </div>
                <Field variant="outlined">
                  <FieldLabel htmlFor="buscar-funcionario-cesion">Ceder a</FieldLabel>
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="buscar-funcionario-cesion"
                      placeholder="Buscar funcionario por nombre o documento..."
                      value={cederSearch}
                      onChange={(e) => setCederSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </Field>
                <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                  {(funcionarios?.rows.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground px-1 py-4 text-center text-sm">
                      {cederSearch
                        ? "No se encontró ningún funcionario que coincida con la búsqueda."
                        : "Buscá por nombre o documento para elegir el nuevo dueño."}
                    </p>
                  ) : (
                    funcionarios?.rows.map((funcionario) => (
                      <Button
                        key={funcionario.id}
                        type="button"
                        variant="outline"
                        color="neutral"
                        size="sm"
                        className="justify-start"
                        disabled={cederMutation.isPending}
                        onClick={() =>
                          cederMutation.mutate({ unidadId: unidad.id, nuevoFuncionarioId: funcionario.id })
                        }
                      >
                        <UserSwitchIcon data-icon="inline-start" />
                        <span className="truncate">
                          {funcionario.name} · {funcionario.documentNumber}
                        </span>
                      </Button>
                    ))
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="fill" color="neutral" disabled={cederMutation.isPending}>
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
                Se eliminará permanentemente {articulo === "el" ? "el" : "la"} {instrumentoLower} &ldquo;
                {unidad.nombre}&rdquo;, junto con sus criterios y {actividadesLower} {vinculadas}. Esta
                acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                color="destructive"
                disabled={deleteMutation.isPending}
                aria-busy={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(unidad.id)}
              >
                {deleteMutation.isPending ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <CheckIcon data-icon="inline-start" />
                )}
                Si
              </AlertDialogAction>
              <AlertDialogCancel variant="fill" color="neutral" disabled={deleteMutation.isPending}>
                <XIcon data-icon="inline-start" />
                No
              </AlertDialogCancel>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
