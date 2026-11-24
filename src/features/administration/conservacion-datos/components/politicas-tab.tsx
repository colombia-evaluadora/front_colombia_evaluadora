"use no memo"

import { useState } from "react"
import { createPortal } from "react-dom"
import type { ColumnDef } from "@tanstack/react-table"

import { TableScreenToolbar } from "@/components/layout/table-screen"
import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { paginarLocal } from "@/features/administration/conservacion-datos/lib/paginar-local"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { useEstadoPolitica } from "@/features/administration/conservacion-datos/api/mutations/conservacion-mutations"
import { usePoliticasQuery } from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import {
  CUENTA_DESDE_LABELS,
  DISPOSICION_LABELS,
  type Politica,
} from "@/features/administration/conservacion-datos/api/types"
import { CheckCircleIcon, ControlPointIcon, PencilIcon, ProhibitIcon } from "@/components/ui/icons"
import { DialogPolitica } from "@/features/administration/conservacion-datos/components/dialog-politica"
import { RowActions } from "@/features/administration/conservacion-datos/components/row-actions"
import { anchoAcciones } from "@/features/administration/conservacion-datos/lib/ancho-acciones"

/** Sin tildes ni mayúsculas: «gestion» encuentra «Gestión estudiantil». */
const normalizar = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

const SIN_VALOR = <span className="text-muted-foreground">—</span>

/** S.12.POL.1: una fila por tipo de registro. Administrador y Gestor solo consultan. */
export function PoliticasTab({ puedeEditar, toolbarSlot }: { puedeEditar: boolean; toolbarSlot: HTMLElement | null }) {
  // Nueva política y Modificar abren el mismo modal; `politica` null = nueva.
  const [dialogo, setDialogo] = useState<{ politica: Politica | null } | null>(null)
  const { notify } = useNotify()
  const paginacion = useTablePagination()
  const [busqueda, setBusqueda] = useState("")
  const { data = [], isPending, isError, error, refetch } = usePoliticasQuery()
  const estado = useEstadoPolitica({
    mutationConfig: {
      onSuccess: (p) =>
        notify(p.habilitado ? SUCCESS_MESSAGES.politicaConservacion.activated : SUCCESS_MESSAGES.politicaConservacion.deactivated),
      onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
    },
  })

  const columns: ColumnDef<Politica>[] = [
    {
      id: "tipoRegistro",
      accessorKey: "tipoRegistro",
      meta: { label: "Tipo de registro" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de registro" />,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="font-medium">{row.original.tipoRegistro}</span>
          {!row.original.permanente && !row.original.conFuente ? (
            <span className="text-xs text-muted-foreground">La plataforma aún no lee este tipo: no vence.</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "modulo",
      accessorKey: "modulo",
      meta: { label: "Módulo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Módulo" />,
    },
    {
      id: "plazo",
      accessorFn: (p) => (p.permanente ? 1000 : (p.plazoMinimo ?? 0)),
      meta: { label: "Plazo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plazo" />,
      cell: ({ row }) =>
        row.original.permanente ? (
          <Badge variant="soft" color="info">
            Permanente
          </Badge>
        ) : (
          <span className="tabular-nums">
            {row.original.plazoMinimo} {row.original.plazoMinimo === 1 ? "año" : "años"}
          </span>
        ),
      size: 130,
    },
    {
      id: "cuentaDesde",
      accessorFn: (p) => (p.cuentaDesde ? CUENTA_DESDE_LABELS[p.cuentaDesde] : ""),
      meta: { label: "Se cuenta desde" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Se cuenta desde" />,
      cell: ({ row }) => (row.original.cuentaDesde ? CUENTA_DESDE_LABELS[row.original.cuentaDesde] : SIN_VALOR),
    },
    {
      id: "disposicion",
      accessorFn: (p) => (p.disposicion ? DISPOSICION_LABELS[p.disposicion] : ""),
      meta: { label: "Disposición final" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Disposición final" />,
      cell: ({ row }) => (row.original.disposicion ? DISPOSICION_LABELS[row.original.disposicion] : SIN_VALOR),
    },
    {
      id: "habilitado",
      accessorFn: (p) => (p.habilitado ? "Activa" : "Inactiva"),
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.habilitado ? (
          <Badge variant="soft" color="success">
            Activa
          </Badge>
        ) : (
          <Badge variant="soft" color="neutral">
            Inactiva
          </Badge>
        ),
      size: 110,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const p = row.original
        return (
          <RowActions
            items={
              puedeEditar
                ? [
                    {
                      label: "Modificar",
                      icon: <PencilIcon />,
                      onClick: () => setDialogo({ politica: p }),
                    },
                    {
                      label: p.habilitado ? "Inactivar" : "Activar",
                      icon: p.habilitado ? <ProhibitIcon /> : <CheckCircleIcon />,
                      disabled: estado.isPending,
                      onClick: () => estado.mutate({ id: p.pkPolitica, habilitado: !p.habilitado }),
                    },
                  ]
                : []
            }
          />
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: anchoAcciones(puedeEditar ? 2 : 0),
    },
  ]

  // Búsqueda en el navegador (la lista es corta): tipo de registro o módulo.
  const q = normalizar(busqueda.trim())
  const filtradas = q
    ? data.filter((p) => normalizar(`${p.tipoRegistro} ${p.modulo}`).includes(q))
    : data

  const { pagina, pageCount, pageIndex } = paginarLocal(filtradas, paginacion, (p, col) =>
    col === "plazo" ? (p.permanente ? 1000 : (p.plazoMinimo ?? 0)) : String(p[col as keyof Politica] ?? ""),
  )
  const { table } = useDataTable({
    columns,
    data: pagina,
    pageCount,
    getRowId: (row) => String(row.pkPolitica),
    ...paginacion,
    pageIndex,
    columnVisibilityStorageKey: "conservacion-politicas-column-visibility",
  })

  return (
    // Mismo contenedor que Ampliaciones y Archivo histórico: separa el botón de la tabla.
    <div className="flex flex-col gap-4">
    {/* Línea de herramientas: buscador a la izquierda y el botón de crear a la derecha. */}
    {/* En el encabezado, bajo las pestañas, como la barra de las demás vistas (con su línea de cierre). */}
    {toolbarSlot
      ? createPortal(
          <TableScreenToolbar>
      <SearchQueryBar
        id="politicas-search"
        label="Buscar por tipo de registro o módulo"
        placeholder="Buscar"
        value={busqueda}
        onValueChange={(v) => {
          setBusqueda(v)
          paginacion.goToPage(0)
        }}
        onClearAll={() => setBusqueda("")}
        activeFilterCount={busqueda ? 1 : 0}
      />
      {puedeEditar ? (
        <Button color="primary" size="sm" onClick={() => setDialogo({ politica: null })}>
          <ControlPointIcon data-icon="inline-start" />
          Nueva política
        </Button>
      ) : null}
          </TableScreenToolbar>,
          toolbarSlot,
        )
      : null}
    <DataTable
      table={table}
      isPending={isPending}
      isError={isError}
      onRetry={refetch}
      errorMessage={error ? getErrorMessage(error) : undefined}
      // Inactivas atenuadas; los íconos del hover quedan al 100%.
      isRowMuted={(row) => !row.original.habilitado}
      emptyMessage={
        q && data.length > 0
          ? "Ninguna política coincide con la búsqueda."
          : puedeEditar
          ? "Aún no hay políticas de conservación. Mientras no haya, ningún registro vence. Use Nueva política para agregar la primera."
          : "Aún no hay políticas de conservación. Mientras no haya, ningún registro vence."
      }
    />
    <Pagination
      viewOptions={<DataTableViewOptions table={table} />}
      pageIndex={pageIndex}
      pageCount={pageCount}
      canPrev={pageIndex > 0}
      canNext={pageIndex < pageCount - 1}
      onPageChange={paginacion.goToPage}
      totalCount={filtradas.length}
      pageSize={paginacion.pageSize}
      onPageSizeChange={paginacion.setPageSize}
    />
    {dialogo ? (
      <DialogPolitica
        key={dialogo.politica?.pkPolitica ?? "nueva"}
        politica={dialogo.politica}
        onClose={() => setDialogo(null)}
      />
    ) : null}
    </div>
  )
}
