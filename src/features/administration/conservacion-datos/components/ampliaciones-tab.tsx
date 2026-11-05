"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { useNotify } from "@/components/notice/notice-context"
import { Input } from "@/components/ui/input"
import { SelectCampo } from "@/features/administration/conservacion-datos/components/select-campo"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { toDigitsOnly } from "@/lib/text-input"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"

import { useSaveAmpliacion } from "@/features/administration/conservacion-datos/api/mutations/conservacion-mutations"
import { useAmpliacionesQuery } from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import type { Ampliacion } from "@/features/administration/conservacion-datos/api/types"
import {
  ACCIONES_SIZE,
  AccionesFila,
  ErrorCampo,
} from "@/features/administration/parametros-edad/components/tabla-parametros"

import {
  DialogNuevaAmpliacion,
  PLAZO_MENOR_MENSAJE,
} from "@/features/administration/conservacion-datos/components/dialog-nueva-ampliacion"

const anios = (n: number) => `${n} ${n === 1 ? "año" : "años"}`

/**
 * S.12.AMP.1: el plazo de cada tipo de registro en un establecimiento; solo se
 * alarga. El selector de establecimiento es solo del Superadministrador; el
 * Administrador y el Gestor ven el suyo (lo resuelve el back).
 */
export function AmpliacionesTab({
  esSuperAdmin,
  puedeEditar,
  nuevaAbierta,
  onCerrarNueva,
}: {
  esSuperAdmin: boolean
  puedeEditar: boolean
  /** + Ampliación del encabezado de la página. */
  nuevaAbierta: boolean
  onCerrarNueva: () => void
}) {
  const { notify } = useNotify()
  const establecimientos = useEstablishmentsOptionsQuery(esSuperAdmin)
  const [elegido, setElegido] = useState<number | null>(null)
  const pkEstablecimiento = esSuperAdmin ? (elegido ?? establecimientos.data?.[0]?.id ?? null) : null
  const { data = [], isPending, isError, error, refetch } = useAmpliacionesQuery(
    pkEstablecimiento,
    !esSuperAdmin || pkEstablecimiento != null,
  )

  const [edicion, setEdicion] = useState<{ pkPolitica: number; valor: string; error?: string } | null>(null)
  const save = useSaveAmpliacion({
    mutationConfig: {
      onSuccess: () => {
        setEdicion(null)
        notify(SUCCESS_MESSAGES.ampliacion.updated)
      },
      onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
    },
  })

  // Submit del form que envuelve la tabla: ✓ y Enter guardan, como en Parámetros de edad.
  function guardar(e: React.FormEvent) {
    e.preventDefault()
    const fila = data.find((f) => f.pkPolitica === edicion?.pkPolitica)
    if (!fila || !edicion) return
    const plazo = Number(edicion.valor)
    // Sin cambios no se guarda.
    if (plazo === (fila.plazoEstablecimiento ?? fila.plazoMinimo)) return setEdicion(null)
    if (!edicion.valor || plazo > 99) {
      setEdicion({ ...edicion, error: "Escriba un plazo de hasta 99 años." })
      return
    }
    if (plazo < fila.plazoMinimo) {
      setEdicion({ ...edicion, error: PLAZO_MENOR_MENSAJE })
      return
    }
    save.mutate({ pkAmpliacion: fila.pkAmpliacion, pkPolitica: fila.pkPolitica, pkEstablecimiento, plazo })
  }

  const columns: ColumnDef<Ampliacion>[] = [
    {
      id: "tipoRegistro",
      accessorKey: "tipoRegistro",
      meta: { label: "Tipo de registro" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de registro" />,
      cell: ({ row }) => <span className="font-medium">{row.original.tipoRegistro}</span>,
      enableSorting: false,
    },
    {
      id: "plazoMinimo",
      accessorKey: "plazoMinimo",
      meta: { label: "Plazo mínimo" },
      header: () => <span className="block text-right">Plazo mínimo</span>,
      cell: ({ row }) => <span className="block text-right tabular-nums">{anios(row.original.plazoMinimo)}</span>,
      enableSorting: false,
      size: 140,
    },
    {
      id: "plazoEstablecimiento",
      accessorKey: "plazoEstablecimiento",
      meta: { label: "Plazo del establecimiento" },
      header: () => <span className="block text-right">Plazo del establecimiento</span>,
      cell: ({ row }) => {
        const fila = row.original
        if (edicion?.pkPolitica === fila.pkPolitica) {
          return (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  inputMode="numeric"
                  variant="outlined"
                  size="sm"
                  aria-label={`Plazo de ${fila.tipoRegistro} en años`}
                  aria-invalid={Boolean(edicion.error)}
                  className="h-8 w-14 text-right tabular-nums"
                  value={edicion.valor}
                  onChange={(e) => setEdicion({ pkPolitica: fila.pkPolitica, valor: toDigitsOnly(e.target.value, 2) })}
                  onKeyDown={(e) => e.key === "Escape" && setEdicion(null)}
                />
                <span className="text-muted-foreground">años</span>
              </div>
              <ErrorCampo mensaje={edicion.error ?? null} />
            </div>
          )
        }
        return fila.plazoEstablecimiento != null && fila.plazoEstablecimiento > fila.plazoMinimo ? (
          <span className="block text-right font-medium tabular-nums">{anios(fila.plazoEstablecimiento)}</span>
        ) : (
          <span className="block text-right text-muted-foreground tabular-nums">
            {anios(fila.plazoMinimo)} (sin ampliar)
          </span>
        )
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const fila = row.original
        if (!puedeEditar) return null
        return (
          <AccionesFila
            editando={edicion?.pkPolitica === fila.pkPolitica}
            puedeEditar={!edicion}
            guardando={save.isPending}
            etiqueta={fila.tipoRegistro}
            onModificar={() =>
              setEdicion({ pkPolitica: fila.pkPolitica, valor: String(fila.plazoEstablecimiento ?? fila.plazoMinimo) })
            }
            onCancelar={() => setEdicion(null)}
          />
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: ACCIONES_SIZE,
    },
  ]

  const { table } = useDataTable({
    columns,
    data,
    pageCount: 1,
    getRowId: (row) => String(row.pkPolitica),
    pageIndex: 0,
    pageSize: Math.max(data.length, 1),
    goToPage: () => {},
    setPageSize: () => {},
    sorting: [],
    setSorting: () => {},
  })

  return (
    <div className="flex flex-col gap-4">
      {esSuperAdmin ? (
        <SelectCampo
          id="ampliaciones-establecimiento"
          label="Establecimiento"
          className="w-full max-w-md"
          buscable
          value={pkEstablecimiento != null ? String(pkEstablecimiento) : ""}
          disabled={establecimientos.isPending}
          options={(establecimientos.data ?? []).map((e) => ({ value: String(e.id), label: e.name }))}
          onChange={(v) => {
            if (!v) return
            setEdicion(null)
            setElegido(Number(v))
          }}
        />
      ) : null}
      <form onSubmit={guardar} aria-label="Ampliaciones" className="min-w-0">
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        errorMessage={error ? getErrorMessage(error) : undefined}
        emptyMessage="No hay políticas activas con plazo. Cuando el Superadministrador las defina, podrá alargar sus plazos aquí."
        isRowActive={(row) => row.original.pkPolitica === edicion?.pkPolitica}
      />
      </form>
      {nuevaAbierta ? (
        <DialogNuevaAmpliacion
          filas={data.filter((f) => f.pkAmpliacion == null)}
          pkEstablecimiento={pkEstablecimiento}
          onClose={onCerrarNueva}
        />
      ) : null}
    </div>
  )
}
