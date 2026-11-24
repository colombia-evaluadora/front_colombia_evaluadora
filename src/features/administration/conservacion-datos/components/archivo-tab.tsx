"use no memo"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import type { ColumnDef } from "@tanstack/react-table"

import { TableScreenToolbar } from "@/components/layout/table-screen"
import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckIcon, FileDownloadOutlinedIcon, FilePdfIcon, XCircleIcon } from "@/components/ui/icons"
import { SelectCampo } from "@/features/administration/conservacion-datos/components/select-campo"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { toPageCount } from "@/lib/pagination"
import { conservacionDatosRoute } from "@/router"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"

import { useDescargarArchivo } from "@/features/administration/conservacion-datos/api/mutations/conservacion-mutations"
import {
  useArchivoQuery,
  usePoliticasQuery,
} from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import type { ConservacionSearch } from "@/features/administration/conservacion-datos/api/schema"
import {
  fechaCorta,
  HUELLA_NO_COINCIDE,
  HuellaNoCoincideError,
  type Archivado,
} from "@/features/administration/conservacion-datos/api/types"
import { RowActions } from "@/features/administration/conservacion-datos/components/row-actions"
import { anchoAcciones } from "@/features/administration/conservacion-datos/lib/ancho-acciones"

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS = Array.from({ length: 15 }, (_, i) => ANIO_ACTUAL - i)

/** Descarga rechazada porque la huella no coincide (S.12.HIS.1a). */
interface HuellaFallida {
  archivo: Archivado
  guardada: string
  calculada: string
}

/**
 * S.12.HIS.1: el índice de lo archivado. Solo lectura: no se restaura.
 * Administrador y Gestor ven solo su establecimiento (lo filtra el back).
 */
export function ArchivoTab({ esSuperAdmin, toolbarSlot }: { esSuperAdmin: boolean; toolbarSlot: HTMLElement | null }) {
  const { notify } = useNotify()
  const search = conservacionDatosRoute.useSearch()
  const navigate = conservacionDatosRoute.useNavigate()
  const paginacion = useTablePagination()
  const [texto, setTexto] = useState(search.q ?? "")
  const [huella, setHuella] = useState<HuellaFallida | null>(null)

  const establecimientos = useEstablishmentsOptionsQuery(esSuperAdmin)
  const politicas = usePoliticasQuery()
  const tipos = [...new Set((politicas.data ?? []).map((p) => p.tipoRegistro))].sort((a, b) => a.localeCompare(b, "es"))

  const { data, isPending, isFetching, isError, error, refetch } = useArchivoQuery({
    q: search.q,
    pkEstablecimiento: search.establecimiento,
    tipoRegistro: search.tipo,
    anio: search.anio,
    page: paginacion.pageIndex,
    pageSize: paginacion.pageSize,
  })
  const total = data?.total ?? 0
  const pageCount = toPageCount(total, paginacion.pageSize)

  const filtrar = (cambios: Partial<ConservacionSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...cambios, page: 0 }), replace: true })
  const filtrosPanel = [esSuperAdmin ? search.establecimiento : undefined, search.tipo, search.anio].filter(
    (v) => v != null && v !== "",
  ).length
  const hayFiltros = Boolean(search.q) || filtrosPanel > 0

  // El texto se aplica solo al dejar de escribir: la búsqueda va al back.
  useEffect(() => {
    const limpio = texto.trim()
    if (limpio === (search.q ?? "")) return
    const t = setTimeout(() => filtrar({ q: limpio || undefined }), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto])

  // Borrador del panel del embudo: se aplica con «Aplicar filtros».
  const [abierto, setAbierto] = useState(false)
  const [borrador, setBorrador] = useState({ establecimiento: "", tipo: "", anio: "" })
  useEffect(() => {
    if (!abierto) return
    setBorrador({
      establecimiento: search.establecimiento != null ? String(search.establecimiento) : "",
      tipo: search.tipo ?? "",
      anio: search.anio != null ? String(search.anio) : "",
    })
  }, [abierto, search.establecimiento, search.tipo, search.anio])

  function aplicar() {
    filtrar({
      establecimiento: borrador.establecimiento ? Number(borrador.establecimiento) : undefined,
      tipo: borrador.tipo || undefined,
      anio: borrador.anio ? Number(borrador.anio) : undefined,
    })
    setAbierto(false)
  }

  function limpiarTodo() {
    setTexto("")
    filtrar({ q: undefined, establecimiento: undefined, tipo: undefined, anio: undefined })
    setAbierto(false)
  }

  const descargar = useDescargarArchivo()
  const bajar = (archivo: Archivado, tipo: "archivo" | "acta") =>
    descargar.mutate(
      { pkArchivo: archivo.pkArchivo, tipo },
      {
        onError: (err) =>
          err instanceof HuellaNoCoincideError
            ? setHuella({ archivo, guardada: err.guardada, calculada: err.calculada })
            : notify(getErrorMessage(err), { variant: "error" }),
      },
    )

  // Orden de columnas del md (S.12.HIS.1): Tipo de registro, Estudiante, Año, Establecimiento,
  // Fecha de disposición y Acta.
  const columns: ColumnDef<Archivado>[] = [
    {
      id: "tipoRegistro",
      accessorKey: "tipoRegistro",
      meta: { label: "Tipo de registro" },
      header: "Tipo de registro",
      enableSorting: false,
    },
    {
      id: "estudiante",
      accessorKey: "estudiante",
      meta: { label: "Estudiante" },
      header: "Estudiante",
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="font-medium">{row.original.estudiante}</span>
          <span className="text-xs text-muted-foreground">{row.original.documento}</span>
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "anio",
      accessorKey: "anio",
      meta: { label: "Año" },
      header: () => <span className="block text-center">Año</span>,
      cell: ({ row }) => <span className="block text-center tabular-nums">{row.original.anio}</span>,
      enableSorting: false,
      size: 80,
    },
    {
      id: "establecimiento",
      accessorKey: "establecimiento",
      meta: { label: "Establecimiento" },
      header: "Establecimiento",
      enableSorting: false,
    },
    {
      id: "fechaDisposicion",
      accessorKey: "fechaDisposicion",
      meta: { label: "Fecha de disposición" },
      header: "Fecha de disposición",
      cell: ({ row }) => <span className="tabular-nums">{fechaCorta(row.original.fechaDisposicion)}</span>,
      enableSorting: false,
    },
    {
      id: "acta",
      meta: { label: "Acta" },
      header: "Acta",
      cell: ({ row }) => (
        <Button
          variant="link"
          color="primary"
          size="sm"
          className="px-0"
          disabled={descargar.isPending}
          onClick={() => bajar(row.original, "acta")}
        >
          <FilePdfIcon data-icon="inline-start" />
          PDF
        </Button>
      ),
      enableSorting: false,
      size: 90,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <RowActions
          items={[
            {
              label: "Descargar archivo",
              icon: <FileDownloadOutlinedIcon />,
              disabled: descargar.isPending,
              onClick: () => bajar(row.original, "archivo"),
            },
            {
              label: "Ver acta",
              icon: <FilePdfIcon />,
              disabled: descargar.isPending,
              onClick: () => bajar(row.original, "acta"),
            },
          ]}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: anchoAcciones(2),
    },
  ]

  const { table } = useDataTable({
    columns,
    data: data?.filas ?? [],
    pageCount,
    getRowId: (row) => String(row.pkArchivo),
    ...paginacion,
    columnVisibilityStorageKey: "conservacion-archivo-column-visibility-v2",
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Reglas de UI: buscador SearchQueryBar; los filtros van en el panel del embudo. */}
      {/* En el encabezado, bajo las pestañas, como la barra de las demás vistas (con su línea de cierre). */}
      {toolbarSlot
        ? createPortal(
            <TableScreenToolbar>
        <SearchQueryBar
          id="archivo-search"
          label="Buscar por estudiante (nombre o documento)"
          placeholder="Buscar"
          value={texto}
          onValueChange={setTexto}
          onClearAll={limpiarTodo}
          activeFilterCount={(search.q ? 1 : 0) + filtrosPanel}
          badgeCount={filtrosPanel}
          open={abierto}
          onOpenChange={setAbierto}
          onApply={aplicar}
          size="sm"
        >
          <div className="flex flex-col gap-3 px-4">
            {esSuperAdmin ? (
              <SelectCampo
                id="archivo-establecimiento"
                label="Establecimiento"
                buscable
                todos="Todos"
                value={borrador.establecimiento}
                options={(establecimientos.data ?? []).map((e) => ({ value: String(e.id), label: e.name }))}
                onChange={(v) => setBorrador((b) => ({ ...b, establecimiento: v }))}
              />
            ) : null}
            <SelectCampo
              id="archivo-tipo"
              label="Tipo de registro"
              todos="Todos"
              value={borrador.tipo}
              options={tipos.map((t) => ({ value: t, label: t }))}
              onChange={(v) => setBorrador((b) => ({ ...b, tipo: v }))}
            />
            <SelectCampo
              id="archivo-anio"
              label="Año"
              todos="Todos"
              value={borrador.anio}
              options={ANIOS.map((a) => ({ value: String(a), label: String(a) }))}
              onChange={(v) => setBorrador((b) => ({ ...b, anio: v }))}
            />
          </div>
        </SearchQueryBar>
            </TableScreenToolbar>,
            toolbarSlot,
          )
        : null}

      <DataTable
        table={table}
        isPending={isPending || (isFetching && !data)}
        isError={isError}
        onRetry={refetch}
        errorMessage={error ? getErrorMessage(error) : undefined}
        emptyMessage={
          hayFiltros
            ? "No hay archivos que coincidan con la búsqueda y los filtros aplicados."
            : "Aún no se ha archivado nada."
        }
      />
      <Pagination
        viewOptions={<DataTableViewOptions table={table} />}
        pageIndex={paginacion.pageIndex}
        pageCount={pageCount}
        canPrev={paginacion.pageIndex > 0}
        canNext={paginacion.pageIndex < pageCount - 1}
        onPageChange={paginacion.goToPage}
        totalCount={total}
        pageSize={paginacion.pageSize}
        onPageSizeChange={paginacion.setPageSize}
      />

      <DialogHuella fallida={huella} onClose={() => setHuella(null)} />
    </div>
  )
}

/**
 * S.12.HIS.1a: la huella del archivo descargado no coincide con la guardada al archivar. El archivo no se
 * entrega y el intento queda en la Bitácora (lo registra el back). Aviso de bloqueo: ícono rojo junto al
 * título y un solo botón «Entendido».
 */
function DialogHuella({ fallida, onClose }: { fallida: HuellaFallida | null; onClose: () => void }) {
  const a = fallida?.archivo
  return (
    <Dialog open={fallida != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <XCircleIcon aria-hidden className="size-6 shrink-0 text-red" />
            No se pudo verificar el archivo
          </DialogTitle>
          <DialogDescription className="text-foreground">{HUELLA_NO_COINCIDE}</DialogDescription>
        </DialogHeader>
        {a ? (
          <dl className="grid gap-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Archivo</dt>
              <dd className="font-medium">
                {a.tipoRegistro} · {a.establecimiento} · {a.anio} · {a.estudiante}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Huella guardada</dt>
              <dd className="font-mono text-xs break-all">{fallida.guardada}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Huella calculada</dt>
              <dd className="font-mono text-xs break-all text-red">{fallida.calculada}</dd>
            </div>
          </dl>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button size="sm" color="primary" />}>
            <CheckIcon data-icon="inline-start" />
            Entendido
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
