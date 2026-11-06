"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CheckIcon,
  PencilIcon,
  SpinnerIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { toDigitsOnly } from "@/lib/text-input"

import {
  ErrorCampo,
  SelectFila,
} from "@/features/administration/parametros-edad/components/tabla-parametros"
import {
  MAXIMO_MAX,
  MAXIMO_MIN,
  type Opcion,
  type RelacionAlumnoGrupo,
} from "@/features/administration/relaciones-alumno-grupo/api/types"

/** id de la fila de alta. */
const NUEVA = "nueva"

/** Fila en edición: `pkRelacion` null = alta. Al modificar solo cambia el máximo. */
export interface EdicionRelacion {
  pkRelacion: number | null
  nivel: string
  zona: string
  maximo: string
}

interface Fila {
  id: string
  relacion: RelacionAlumnoGrupo | null
}

const sinCambio = () => {}

export function TablaRelaciones({
  relaciones,
  niveles,
  zonas,
  edicion,
  onEdicion,
  puedeEditar,
  puedeEliminar,
  guardando,
  onGuardar,
  onEliminar,
}: {
  relaciones: RelacionAlumnoGrupo[]
  niveles: Opcion[]
  zonas: Opcion[]
  edicion: EdicionRelacion | null
  onEdicion: (edicion: EdicionRelacion | null) => void
  puedeEditar: boolean
  puedeEliminar: boolean
  guardando: boolean
  onGuardar: (edicion: EdicionRelacion) => Promise<unknown>
  onEliminar: (relacion: RelacionAlumnoGrupo) => void
}) {
  const [error, setError] = useState<string | null>(null)

  function cambiar(cambio: Partial<EdicionRelacion>) {
    if (edicion) onEdicion({ ...edicion, ...cambio })
  }

  function cancelar() {
    onEdicion(null)
    setError(null)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!edicion) return
    const maximo = Number(edicion.maximo)
    const actual = relaciones.find((r) => r.pkRelacion === edicion.pkRelacion)
    if (actual && actual.maximo === maximo) return cancelar()
    if (!edicion.nivel) return setError("Seleccione el nivel educativo.")
    if (!edicion.zona) return setError("Seleccione la zona.")
    const repetida = relaciones.some(
      (r) =>
        r.pkRelacion !== edicion.pkRelacion &&
        String(r.pkNivel) === edicion.nivel &&
        String(r.pkZona) === edicion.zona,
    )
    if (repetida) return setError("Ya existe un máximo para ese nivel y zona.")
    if (!edicion.maximo || maximo < MAXIMO_MIN || maximo > MAXIMO_MAX) {
      return setError(`El máximo debe ser de ${MAXIMO_MIN} a ${MAXIMO_MAX}.`)
    }
    try {
      await onGuardar(edicion)
      cancelar()
    } catch {
      // La página muestra el aviso; la fila sigue abierta para corregir.
    }
  }

  const editandoId = edicion ? (edicion.pkRelacion == null ? NUEVA : String(edicion.pkRelacion)) : null
  // La fila de alta va al final, como en el prototipo.
  const data: Fila[] = [
    ...relaciones.map((r) => ({ id: String(r.pkRelacion), relacion: r })),
    ...(edicion?.pkRelacion === null ? [{ id: NUEVA, relacion: null }] : []),
  ]

  const columns: ColumnDef<Fila>[] = [
    {
      id: "nivel",
      meta: { label: "Nivel educativo" },
      enableSorting: false,
      enableHiding: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel educativo" />,
      cell: ({ row }) =>
        row.original.relacion?.nivel ?? (
          <SelectFila
            label="Nivel educativo"
            placeholder="Elija el nivel"
            opciones={niveles}
            value={edicion?.nivel ?? ""}
            onChange={(v) => cambiar({ nivel: v })}
          />
        ),
    },
    {
      id: "zona",
      meta: { label: "Zona" },
      enableSorting: false,
      enableHiding: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Zona" />,
      cell: ({ row }) =>
        row.original.relacion?.zona ?? (
          <SelectFila
            label="Zona"
            placeholder="Elija la zona"
            className="max-w-40"
            opciones={zonas}
            value={edicion?.zona ?? ""}
            onChange={(v) => cambiar({ zona: v })}
          />
        ),
    },
    {
      id: "maximo",
      meta: { label: "Máximo de estudiantes por grupo" },
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="block text-right">Máximo de estudiantes por grupo</span>,
      cell: ({ row }) => {
        if (row.id !== editandoId) {
          return <span className="block text-right tabular-nums">{row.original.relacion?.maximo}</span>
        }
        return (
          <div className="flex flex-col items-end gap-1">
            <Input
              inputMode="numeric"
              autoFocus={edicion?.pkRelacion != null}
              aria-label="Máximo de estudiantes por grupo"
              aria-invalid={Boolean(error)}
              variant="outlined"
              size="sm"
              placeholder="Máximo"
              className="h-8 w-20 text-right tabular-nums"
              value={edicion?.maximo ?? ""}
              onChange={(e) => cambiar({ maximo: toDigitsOnly(e.target.value, 2) })}
            />
            <ErrorCampo mensaje={error} />
          </div>
        )
      },
    },
    {
      id: "actions",
      size: 96,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const r = row.original.relacion
        if (row.id === editandoId) {
          return (
            <div key="editando" className="flex justify-end gap-1">
              <Button
                type="submit"
                color="primary"
                size="icon-sm"
                aria-label="Guardar relación"
                disabled={guardando}
                aria-busy={guardando}
              >
                {guardando ? <SpinnerIcon className="animate-spin" /> : <CheckIcon />}
              </Button>
              <Button
                type="button"
                variant="fill"
                color="neutral"
                size="icon-sm"
                aria-label="Cancelar edición"
                disabled={guardando}
                onClick={cancelar}
              >
                <XIcon />
              </Button>
            </div>
          )
        }
        if (!r) return null
        return (
          <div key="leyendo" className="flex justify-end gap-1">
            {puedeEditar && (
              <AccionIcono
                label="Modificar"
                disabled={Boolean(edicion)}
                onClick={() =>
                  onEdicion({
                    pkRelacion: r.pkRelacion,
                    nivel: String(r.pkNivel),
                    zona: String(r.pkZona),
                    maximo: String(r.maximo),
                  })
                }
              >
                <PencilIcon />
              </AccionIcono>
            )}
            {puedeEliminar && (
              <AccionIcono label="Eliminar" disabled={Boolean(edicion)} onClick={() => onEliminar(r)}>
                <TrashIcon />
              </AccionIcono>
            )}
          </div>
        )
      },
    },
  ]

  const { table } = useDataTable({
    columns,
    data,
    pageCount: 1,
    getRowId: (row) => row.id,
    pageIndex: 0,
    pageSize: Math.max(data.length, 1),
    goToPage: sinCambio,
    setPageSize: sinCambio,
    // Orden fijo del back (nivel, zona): las columnas no se ordenan.
    sorting: [],
    setSorting: sinCambio,
  })

  return (
    <form onSubmit={guardar} aria-label="Relaciones alumno-grupo">
      <DataTable
        table={table}
        isPending={false}
        isError={false}
        onRetry={sinCambio}
        emptyMessage="Aún no hay relaciones alumno-grupo. Use + Relación para agregar la primera."
        isRowActive={(row) => row.id === editandoId}
      />
    </form>
  )
}

/** Botón de ícono con tooltip, como las acciones de Festivos. */
function AccionIcono({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
