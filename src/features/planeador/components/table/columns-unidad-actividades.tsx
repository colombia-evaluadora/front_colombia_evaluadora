import { useState } from "react"
import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
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
import { planeadorRoute } from "@/router"

import { useUpdatePonderacionActividadUnidad } from "@/features/planeador/api/mutations/update-ponderacion-actividad-unidad"
import { useUnlinkActividadUnidad } from "@/features/planeador/api/mutations/unlink-actividad-unidad"
import type { UnidadActividad } from "@/features/planeador/api/types/unidad-tematica"

/** Celda "(%)" editable en línea — clic muestra el input, Enter/blur
 *  guarda, Escape descarta. Solo tiene sentido con cálculo "Ponderado": el
 *  llamador no la renderiza para los otros dos métodos. */
function CeldaPonderacion({
  actividad,
  unidadId,
}: {
  actividad: UnidadActividad
  unidadId: number
}) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(String(actividad.ponderacion))
  const { notify } = useNotify()
  const mutation = useUpdatePonderacionActividadUnidad({
    unidadId,
    mutationConfig: {
      onSuccess: () => {
        notify("Ponderación actualizada.")
        setEditando(false)
      },
      onError: () => notify("No se pudo actualizar la ponderación.", { variant: "error" }),
    },
  })

  if (!editando) {
    return (
      <button
        type="button"
        className="hover:bg-muted-22 -mx-2 rounded px-2 py-1 text-left"
        onClick={() => {
          setValor(String(actividad.ponderacion))
          setEditando(true)
        }}
      >
        {actividad.ponderacion}
      </button>
    )
  }

  function guardar() {
    const next = Number(valor)
    if (Number.isNaN(next) || next < 0 || next > 100) return
    mutation.mutate({ actividadId: actividad.actividadId, ponderacion: next })
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        variant="outlined"
        type="number"
        min={0}
        max={100}
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") guardar()
          if (e.key === "Escape") setEditando(false)
        }}
        disabled={mutation.isPending}
        className="w-16"
      />
      <Button
        variant="ghost"
        color="primary"
        size="icon-xs"
        disabled={mutation.isPending}
        onClick={guardar}
        aria-label="Guardar ponderación"
      >
        {mutation.isPending ? <SpinnerIcon className="animate-spin" /> : <CheckIcon />}
      </Button>
    </div>
  )
}

function BotonDesvincular({
  actividad,
  unidadId,
}: {
  actividad: UnidadActividad
  unidadId: number
}) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()
  const unlink = useUnlinkActividadUnidad({
    unidadId,
    mutationConfig: {
      onSuccess: () => {
        notify("Actividad desvinculada.")
        setOpen(false)
      },
      onError: () => notify("No se pudo desvincular la actividad.", { variant: "error" }),
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label="Desvincular actividad"
          />
        }
      >
        <LinkBreakIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desvincular actividad</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{actividad.nombre}&rdquo; volverá a quedar sin unidad (huérfana). Podés volver a
            vincularla más adelante.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={unlink.isPending}
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

/**
 * Columnas de las actividades vinculadas a una unidad, con su peso dentro de
 * ella.
 *
 * `unidadId` (para invalidar su detalle) y `esPonderado` (la columna "(%)"
 * solo se edita en línea cuando la unidad calcula por "Ponderado" — con
 * "Promedio simple"/"Suma de puntos" el backend rechaza que se mande) viajan
 * como parámetros porque las celdas necesitan ambos.
 */
export function createUnidadActividadesColumns(
  unidadId: number,
  esPonderado: boolean,
): ColumnDef<UnidadActividad>[] {
  return [
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Actividad" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Actividad" />,
      cell: ({ row }) => <span className="font-semibold">{row.original.nombre}</span>,
    },
    {
      id: "tipo",
      accessorKey: "tipo",
      meta: { label: "Tipo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => <span>{row.original.tipo}</span>,
    },
    {
      id: "instrumento",
      accessorKey: "instrumento",
      meta: { label: "Instrumento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Instrumento" />,
      cell: ({ row }) => <span>{row.original.instrumento}</span>,
    },
    {
      id: "grupo",
      accessorKey: "grupo",
      meta: { label: "Grupo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
      cell: ({ row }) => <span>{row.original.grupo}</span>,
    },
    {
      id: "ponderacion",
      accessorKey: "ponderacion",
      meta: { label: "(%)" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="(%)" />,
      cell: ({ row }) =>
        esPonderado ? (
          <CeldaPonderacion actividad={row.original} unidadId={unidadId} />
        ) : (
          <span>{row.original.ponderacion}</span>
        ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {/* `actividad.actividadId`, no `actividad.id` (el vínculo) — ver
              el comentario de `UnidadActividad` en `unidad-tematica.ts`. */}
          {/* "Ver" va al listado principal del Planeador con la actividad
              seleccionada (`?actividad=`), que abre el mismo panel embebido
              que al hacer click en su card — no a la página standalone
              `planeadorDetalle` (esa es un drill-down aparte, con su propio
              "Volver al Planeador"; acá el usuario ya está viendo el
              detalle de una UNIDAD, así que "Ver" tiene que llevarlo a la
              vista con la que el resto de la app ya muestra una
              actividad). */}
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={`Ver ${row.original.nombre}`}
            render={
              <Link
                to={planeadorRoute.id}
                search={{ actividad: String(row.original.actividadId) }}
              />
            }
          >
            <EyeIcon />
          </Button>
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={`Editar ${row.original.nombre}`}
            render={
              <Link
                to={paths.app.planeadorActividadEditar.getHref(String(row.original.actividadId))}
              />
            }
          >
            <PencilIcon />
          </Button>
          {/* Chulito: abre el panel del listado principal directo en modo
              "Marcar" (`?modo=grades`), la misma vista que el botón ✓ del
              header de `ActividadDetallePanel`. */}
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={`Calificar ${row.original.nombre}`}
            render={
              <Link
                to={planeadorRoute.id}
                search={{ actividad: String(row.original.actividadId), modo: "grades" }}
              />
            }
          >
            <CheckIcon />
          </Button>
          <BotonDesvincular actividad={row.original} unidadId={unidadId} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 208,
    },
  ]
}
