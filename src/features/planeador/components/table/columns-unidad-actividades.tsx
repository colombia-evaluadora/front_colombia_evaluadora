import { useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { Input } from "@/components/ui/input"
import { DataTableColumnHeader } from "@/components/data-table"
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
import {
  CheckIcon,
  EyeIcon,
  LinkBreakIcon,
  PencilIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { planeadorRoute } from "@/router"
import type { PlaneadorAlcanceSearch } from "@/features/planeador/hooks/use-planeador-docente-scope"

import { useUpdatePonderacionActividadUnidad } from "@/features/planeador/api/mutations/update-ponderacion-actividad-unidad"
import { useUpdatePuntajeActividadUnidad } from "@/features/planeador/api/mutations/update-puntaje-actividad-unidad"
import { useUnlinkActividadUnidad } from "@/features/planeador/api/mutations/unlink-actividad-unidad"
import type { MetodoCalculo, UnidadActividad } from "@/features/planeador/api/types/unidad-tematica"
import {
  ROTULO_ACTIVIDAD_FALLBACK,
  rotuloEnMinuscula,
} from "@/features/planeador/api/query/use-rotulo-actividad-query"
import { UNIDAD_TAB_FALLBACK } from "@/features/planeador/components/planeador-tabs"
import { articuloDefinidoRotulo, terminacionRotulo } from "@/features/planeador/lib/rotulo-gramatica"

/** Celda bloqueada por Regla 37: `<span>` enfocable (no botón deshabilitado) para que el tooltip con el motivo se vea. */
function ValorBloqueado({ valor, motivo }: { valor: ReactNode; motivo: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            aria-disabled="true"
            className="text-muted-foreground -mx-2 inline-flex cursor-not-allowed rounded px-2 py-1"
          />
        }
      >
        {valor}
      </TooltipTrigger>
      <TooltipContent>{motivo}</TooltipContent>
    </Tooltip>
  )
}

/** Celda "(%)" editable en línea; solo para cálculo "Ponderado". */
function CeldaPonderacion({
  actividad,
  maxDisponible,
}: {
  actividad: UnidadActividad
  /** Tope optimista (100 - resto de la unidad); el real lo topa el backend por (unidad, grupo), sso V223. */
  maxDisponible: number
}) {
  const [editando, setEditando] = useState(false)
  // Sin red no se cambian ponderaciones/puntajes (plan offline §7.5).
  const soloEnLinea = useOnlineOnly()
  const [valor, setValor] = useState(String(actividad.ponderacion))
  const [intentado, setIntentado] = useState(false)
  const { notify } = useNotify()
  const mutation = useUpdatePonderacionActividadUnidad({
    mutationConfig: {
      onSuccess: () => {
        notify("Ponderación actualizada.")
        setEditando(false)
      },
      // Motivo del backend (p. ej. Regla 37), no un genérico.
      onError: (error) =>
        notify(`No se pudo actualizar la ponderación. ${getErrorMessage(error)}`, { variant: "error" }),
    },
  })

  if (actividad.motivoNoEditable) {
    return <ValorBloqueado valor={actividad.ponderacion} motivo={actividad.motivoNoEditable} />
  }

  if (!editando) {
    return (
      <button
        type="button"
        className="hover:bg-muted-22 -mx-2 rounded px-2 py-1 text-left"
        onClick={() => {
          setValor(String(actividad.ponderacion))
          setIntentado(false)
          setEditando(true)
        }}
      >
        {actividad.ponderacion}
      </button>
    )
  }

  // Antes un valor vacío se ignoraba en silencio al guardar: ahora se marca en rojo con su motivo.
  const error =
    valor.trim() === ""
      ? "Ingresa la ponderación."
      : Number(valor) < 0 || Number(valor) > maxDisponible
        ? `Debe estar entre 0 y ${maxDisponible}%.`
        : null
  const invalido = intentado && error != null

  function guardar() {
    setIntentado(true)
    if (error) return
    mutation.mutate({ actividadId: actividad.actividadId, ponderacion: Number(valor) })
  }

  return (
    <div className="flex flex-col gap-0.5">
    <div className="flex items-center gap-1">
      <Input
        variant="outlined"
        type="number"
        min={0}
        max={maxDisponible}
        autoFocus
        value={valor}
        aria-invalid={invalido}
        aria-describedby={invalido ? `ponderacion-error-${actividad.actividadId}` : undefined}
        onChange={(e) => {
          const raw = e.target.value
          // `max` del input no bloquea el tecleo: se clampea a mano.
          setValor(raw === "" ? "" : String(Math.min(Number(raw) || 0, maxDisponible)))
          setIntentado(true)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !soloEnLinea.disabled) guardar()
          if (e.key === "Escape") setEditando(false)
        }}
        disabled={mutation.isPending}
        className="w-16"
      />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              color="primary"
              size="icon-xs"
              disabled={mutation.isPending || soloEnLinea.disabled}
              onClick={guardar}
              aria-label="Guardar ponderación"
            />
          }
        >
          {mutation.isPending ? <SpinnerIcon className="animate-spin" /> : <CheckIcon />}
        </TooltipTrigger>
        <TooltipContent>Guardar ponderación</TooltipContent>
      </Tooltip>
    </div>
      {invalido && (
        <p id={`ponderacion-error-${actividad.actividadId}`} role="alert" className="text-red text-xs">
          {error}
        </p>
      )}
    </div>
  )
}

/** Celda "Puntaje" para "Suma de puntos": sin tope, el backend deriva el %. */
function CeldaPuntaje({ actividad }: { actividad: UnidadActividad }) {
  const [editando, setEditando] = useState(false)
  // Sin red no se cambian ponderaciones/puntajes (plan offline §7.5).
  const soloEnLinea = useOnlineOnly()
  const [valor, setValor] = useState(String(actividad.notaMaxima ?? ""))
  const [intentado, setIntentado] = useState(false)
  const { notify } = useNotify()
  const mutation = useUpdatePuntajeActividadUnidad({
    mutationConfig: {
      onSuccess: () => {
        notify("Puntaje actualizado.")
        setEditando(false)
      },
      onError: (error) =>
        notify(`No se pudo actualizar el puntaje. ${getErrorMessage(error)}`, { variant: "error" }),
    },
  })

  if (actividad.motivoNoEditable) {
    return <ValorBloqueado valor={actividad.notaMaxima ?? "—"} motivo={actividad.motivoNoEditable} />
  }

  if (!editando) {
    return (
      <button
        type="button"
        className="hover:bg-muted-22 -mx-2 rounded px-2 py-1 text-left"
        onClick={() => {
          setValor(String(actividad.notaMaxima ?? ""))
          setIntentado(false)
          setEditando(true)
        }}
      >
        {actividad.notaMaxima ?? "—"}
      </button>
    )
  }

  // Antes un valor vacío/negativo se ignoraba en silencio: ahora se marca en rojo con su motivo.
  const error = valor.trim() === "" ? "Ingresa el puntaje." : Number(valor) < 0 ? "Debe ser mayor o igual a 0." : null
  const invalido = intentado && error != null

  function guardar() {
    setIntentado(true)
    if (error) return
    mutation.mutate({ actividadId: actividad.actividadId, puntaje: Number(valor) })
  }

  return (
    <div className="flex flex-col gap-0.5">
    <div className="flex items-center gap-1">
      <Input
        variant="outlined"
        type="number"
        min={0}
        autoFocus
        value={valor}
        aria-invalid={invalido}
        aria-describedby={invalido ? `puntaje-error-${actividad.actividadId}` : undefined}
        onChange={(e) => {
          setValor(e.target.value)
          setIntentado(true)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !soloEnLinea.disabled) guardar()
          if (e.key === "Escape") setEditando(false)
        }}
        disabled={mutation.isPending}
        className="w-16"
      />
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              color="primary"
              size="icon-xs"
              disabled={mutation.isPending || soloEnLinea.disabled}
              onClick={guardar}
              aria-label="Guardar puntaje"
            />
          }
        >
          {mutation.isPending ? <SpinnerIcon className="animate-spin" /> : <CheckIcon />}
        </TooltipTrigger>
        <TooltipContent>Guardar puntaje</TooltipContent>
      </Tooltip>
    </div>
      {invalido && (
        <p id={`puntaje-error-${actividad.actividadId}`} role="alert" className="text-red text-xs">
          {error}
        </p>
      )}
    </div>
  )
}

function BotonDesvincular({
  actividad,
  rotuloActividad,
  rotuloUnidad,
}: {
  actividad: UnidadActividad
  rotuloActividad: string
  rotuloUnidad: string
}) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()
  const actividadLower = rotuloEnMinuscula(rotuloActividad)
  const desvincularLabel = `Desvincular ${actividadLower}`
  const soloEnLinea = useOnlineOnly()
  const genero = terminacionRotulo(rotuloActividad)
  const unlink = useUnlinkActividadUnidad({
    mutationConfig: {
      onSuccess: () => {
        notify(`${rotuloActividad} desvinculad${genero}.`)
        setOpen(false)
      },
      onError: (error) =>
        notify(
          `No se pudo desvincular ${articuloDefinidoRotulo(rotuloActividad)} ${actividadLower}. ${getErrorMessage(error)}`,
          { variant: "error" },
        ),
    },
  })

  // Desvincular a mano se permite aunque tenga resultados (sso V492.3): las
  // notas se conservan y la unidad recalcula. Es el paso que pide eliminar
  // una unidad con actividades calificadas (Reglas 38/39).
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={desvincularLabel}
                  disabled={soloEnLinea.disabled}
                />
              }
            />
          }
        >
          <LinkBreakIcon />
        </TooltipTrigger>
        <TooltipContent>{soloEnLinea.tooltip ?? desvincularLabel}</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{desvincularLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{actividad.nombre}&rdquo; volverá a quedar sin {rotuloUnidad.toLowerCase()}{" "}
            (huérfan{genero}). Podés volver a vincularl{genero} más adelante.
            {actividad.tieneResultados && " Sus resultados registrados se conservan."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={unlink.isPending || soloEnLinea.disabled}
            aria-busy={unlink.isPending}
            onClick={() => unlink.mutate(actividad.actividadId)}
          >
            {unlink.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Sí
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={unlink.isPending}>
            <XIcon data-icon="inline-start" />
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Columnas de actividades de una unidad; la columna de peso depende de `metodoCalculo` y
 * `esFormativa` la oculta (se observa, no se califica). */
export function createUnidadActividadesColumns(
  metodoCalculo: MetodoCalculo,
  totalPonderacion: number,
  esFormativa: boolean,
  puedeEditar: boolean,
  puedeEliminar: boolean,
  /** Rótulo real de la unidad (Regla 13). */
  rotuloActividadLabel: string = ROTULO_ACTIVIDAD_FALLBACK,
  rotuloUnidad: string = UNIDAD_TAB_FALLBACK,
  /** Alcance del filtro avanzado: "Ver" lo arrastra al listado, en solo lectura. */
  docenteSearch: PlaneadorAlcanceSearch = {},
): ColumnDef<UnidadActividad>[] {
  const columnaPeso: ColumnDef<UnidadActividad>[] = esFormativa
    ? []
    : metodoCalculo === "Ponderado"
      ? [
          {
            id: "ponderacion",
            accessorKey: "ponderacion",
            meta: { label: "(%)" },
            header: ({ column }) => <DataTableColumnHeader column={column} title="(%)" />,
            cell: ({ row }) => (
              <CeldaPonderacion
                actividad={row.original}
                maxDisponible={Math.max(0, 100 - totalPonderacion + row.original.ponderacion)}
              />
            ),
          },
        ]
      : metodoCalculo === "Suma de puntos"
        ? [
            {
              id: "puntaje",
              accessorKey: "notaMaxima",
              // "(Σ)" pedido en la reunión del 22-sep.
              meta: { label: "(Σ) Puntaje" },
              header: ({ column }) => <DataTableColumnHeader column={column} title="(Σ)" />,
              cell: ({ row }) => <CeldaPuntaje actividad={row.original} />,
            },
          ]
        : []

  return [
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: rotuloActividadLabel },
      header: ({ column }) => <DataTableColumnHeader column={column} title={rotuloActividadLabel} />,
      cell: ({ row }) => <span className="font-semibold">{row.original.nombre}</span>,
    },
    {
      id: "tipo",
      accessorKey: "tipo",
      meta: { label: "Tipo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => <span>{row.original.tipo}</span>,
    },
    // Formativa: sin instrumento de evaluación, la columna quedaba vacía.
    ...(esFormativa
      ? []
      : [
          {
            id: "instrumento",
            accessorKey: "instrumento",
            meta: { label: "Instrumento" },
            header: ({ column }) => <DataTableColumnHeader column={column} title="Instrumento" />,
            cell: ({ row }) => <span>{row.original.instrumento}</span>,
          } satisfies ColumnDef<UnidadActividad>,
        ]),
    {
      id: "grupo",
      accessorKey: "grupo",
      meta: { label: "Grupo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
      cell: ({ row }) => <span>{row.original.grupo}</span>,
    },
    ...columnaPeso,
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {/* `actividadId`, no `id` (el vínculo). */}
          {/* "Ver" abre el panel embebido del listado (`?actividad=`), no `planeadorDetalle`. */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`Ver ${row.original.nombre}`}
                  nativeButton={false}
                  render={
                    <Link
                      to={planeadorRoute.id}
                      search={{ ...docenteSearch, actividad: String(row.original.actividadId) }}
                    />
                  }
                />
              }
            >
              <EyeIcon />
            </TooltipTrigger>
            <TooltipContent>Ver {row.original.nombre}</TooltipContent>
          </Tooltip>
          {/* Regla 37: lápiz visible pero inerte, con el motivo en el tooltip. */}
          {puedeEditar && row.original.motivoNoEditable && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    aria-label={row.original.motivoNoEditable}
                    aria-disabled="true"
                    className="cursor-not-allowed opacity-50"
                  />
                }
              >
                <PencilIcon />
              </TooltipTrigger>
              <TooltipContent>{row.original.motivoNoEditable}</TooltipContent>
            </Tooltip>
          )}
          {puedeEditar && !row.original.motivoNoEditable && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    aria-label={`Editar ${row.original.nombre}`}
                    nativeButton={false}
                    render={
                      <Link
                        to={paths.app.planeadorActividadEditar.getHref(
                          String(row.original.actividadId),
                        )}
                      />
                    }
                  />
                }
              >
                <PencilIcon />
              </TooltipTrigger>
              <TooltipContent>Editar {row.original.nombre}</TooltipContent>
            </Tooltip>
          )}
          {/* Abre el panel en modo "Marcar" (`?modo=grades`); no en solo lectura. */}
          {puedeEditar && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    aria-label={`Calificar ${row.original.nombre}`}
                    nativeButton={false}
                    render={
                      <Link
                        to={planeadorRoute.id}
                        search={{ actividad: String(row.original.actividadId), modo: "grades" }}
                      />
                    }
                  />
                }
              >
                <CheckIcon />
              </TooltipTrigger>
              <TooltipContent>Calificar {row.original.nombre}</TooltipContent>
            </Tooltip>
          )}
          {puedeEliminar && (
            <BotonDesvincular
              actividad={row.original}
              rotuloActividad={rotuloActividadLabel}
              rotuloUnidad={rotuloUnidad}
            />
          )}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 208,
    },
  ]
}
