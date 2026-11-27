"use no memo"

import { useState, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FilePdfIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInformesReportesRoute } from "@/router"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { fetchGrupos } from "@/features/coverage/matricula/api/query/use-matricula-dependent-catalogs-query"
import { useGenerarCertificado } from "@/features/coverage/informes-reportes/api/certificado"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"
import {
  CERTIFICADO_POR_NIVEL,
  invalidarCulminacion,
  useCulminacionQuery,
  useGenerarCulminacion,
  useGradosFinNivelQuery,
  type Culminante,
} from "@/features/coverage/informes-reportes/api/culminacion"
import { CertificadoCalificacionesDialog } from "@/features/coverage/informes-reportes/components/certificado-calificaciones-dialog"

const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—")

function Icono({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span>
            <Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick}>
              {children}
            </Button>
          </span>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function columnas(pendiente: boolean, onGenerar: (c: Culminante) => void): ColumnDef<Culminante>[] {
  const c = (key: keyof Culminante, label: string, cell?: (x: Culminante) => ReactNode, centro = false): ColumnDef<Culminante> => ({
    id: key,
    accessorFn: (x) => x[key],
    meta: { label, className: centro ? "text-center" : undefined },
    header: ({ column }) => <DataTableColumnHeader column={column} title={label} className={centro ? "justify-center" : undefined} />,
    cell: ({ row }) => (cell ? cell(row.original) : ((row.original[key] as ReactNode) ?? "—")),
    enableSorting: false,
  })
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Seleccionar página"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox aria-label={`Seleccionar ${row.original.estudiante}`} checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} />
      ),
      size: 40,
      enableSorting: false,
      enableHiding: false,
    },
    c("documento", "Documento", (x) => <span className="tabular-nums">{x.documento}</span>),
    c("estudiante", "Estudiante", (x) => <span className="font-medium">{x.estudiante}</span>),
    c("grado", "Grado"),
    c("grupo", "Grupo"),
    c("nivel", "Certificado", (x) => CERTIFICADO_POR_NIVEL[x.nivel]),
    c("generado", "Estado", (x) =>
      x.generado ? (
        <Badge variant="soft" color="success" className="text-xs">Generado</Badge>
      ) : (
        <Badge variant="soft" color="warning" className="text-xs">Sin generar</Badge>
      ), true),
    c("numero", "N.º", (x) => <span className="tabular-nums">{x.numero ?? "—"}</span>, true),
    c("generadoEn", "Generado el", (x) => fecha(x.generadoEn), true),
    {
      id: "actions",
      size: 48,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const x = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Icono label={x.generado ? "Volver a generar" : "Generar certificado"} disabled={pendiente} onClick={() => onGenerar(x)}>
              <FilePdfIcon />
            </Icono>
          </div>
        )
      },
    },
  ]
}

/** Certificados de culminación (C.4.CUL.1): matrículas Aprobado del grado de fin de nivel. */
export function CulminacionInforme({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useCulminacionQuery(search, { pageIndex, pageSize })
  const generar = useGenerarCulminacion()
  const calificaciones = useGenerarCertificado()
  const [quinto, setQuinto] = useState<Culminante | null>(null)
  const [lote, setLote] = useState(false)
  const pendiente = generar.isPending || lote

  function generarPropios(sel: Culminante[]) {
    generar.mutate(
      { ids: sel.map((x) => x.matriculaId) },
      {
        onSuccess: () => notify(sel.length === 1 ? `Se generó el certificado de ${sel[0].estudiante}.` : `Se generaron ${sel.length} certificados.`),
        onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
      },
    )
  }

  /** Quinto en lote: un certificado de calificaciones definitivo por matrícula, «A quien interese» y fecha de hoy. */
  async function generarQuinto(sel: Culminante[]) {
    setLote(true)
    try {
      for (const x of sel) {
        await calificaciones.mutateAsync({ matriculaId: x.matriculaId, presentacion: "ESCALA", dirigidaA: "A quien interese", fecha: new Date(), borrador: false })
      }
      notify(`Se generaron ${sel.length} certificados de calificaciones.`)
    } catch (err) {
      notify(getErrorMessage(err), { variant: "error" })
    } finally {
      setLote(false)
      void invalidarCulminacion(queryClient)
    }
  }

  const { table, selectedRows, hasSelection, resetSelection } = useDataTable({
    columns: columnas(pendiente, (x) => (x.nivel === "PRIMARIA" ? setQuinto(x) : generarPropios([x]))),
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (x) => x.matriculaId,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-informes-culminacion",
  })

  const todosQuinto = selectedRows.length > 0 && selectedRows.every((x) => x.nivel === "PRIMARIA")
  const ningunQuinto = selectedRows.length > 0 && selectedRows.every((x) => x.nivel !== "PRIMARIA")

  return (
    <TableScreen>
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        {hasSelection ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="mr-auto font-medium">{selectedRows.length} marcadas</span>
            {todosQuinto || ningunQuinto ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                color="neutral"
                disabled={pendiente}
                onClick={() => (todosQuinto ? void generarQuinto(selectedRows) : generarPropios(selectedRows))}
              >
                {pendiente ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FilePdfIcon data-icon="inline-start" />}
                Generar certificados
              </Button>
            ) : (
              <span className="text-muted-foreground">Marque estudiantes de un mismo tipo de certificado para generarlos en lote.</span>
            )}
            <Button type="button" size="sm" variant="ghost" color="neutral" onClick={resetSelection}>
              <XIcon data-icon="inline-start" />
              Quitar selección
            </Button>
          </div>
        ) : null}
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage="No hay matrículas Aprobado de grados de fin de nivel (Transición, Quinto o Noveno) con estos filtros."
        />
        {data ? (
          <Pagination
            viewOptions={<DataTableViewOptions table={table} />}
            pageIndex={pageIndex}
            pageCount={data.pageCount}
            canPrev={pageIndex > 0}
            canNext={pageIndex < data.pageCount - 1}
            onPageChange={goToPage}
            totalCount={data.totalCount}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        ) : null}
      </TableScreenBody>
      {quinto ? (
        <CertificadoCalificacionesDialog
          matriculaId={quinto.matriculaId}
          resumen={[quinto.estudiante, quinto.grado, quinto.grupo, "Aprobado"].join(" · ")}
          onOpenChange={(open) => {
            if (!open) {
              setQuinto(null)
              void invalidarCulminacion(queryClient)
            }
          }}
        />
      ) : null}
    </TableScreen>
  )
}

/** Grado de fin de nivel y Grupo (C.4.CUL.1). */
export function FiltrosCulminacion() {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const set = (cambios: Record<string, string | number | undefined>) =>
    navigate({ search: (prev) => ({ ...prev, ...cambios, page: 0 }), replace: true })
  const { data: grados = [] } = useGradosFinNivelQuery(search.periodo)
  const { data: grupos = [] } = useQuery({
    queryKey: [...informesKeys.all, "culminacion", "grupos", search.grado ?? "none", search.jornada ?? ""] as const,
    queryFn: () => fetchGrupos(search.grado ?? 0, search.jornada),
    enabled: Boolean(search.grado),
  })
  return (
    <>
      <ComboOpciones
        id="cul-grado"
        label="Grado de fin de nivel"
        todos="Todos"
        size="sm"
        value={search.grado ? String(search.grado) : ""}
        options={grados.map((g) => ({ value: String(g.gradoId), label: g.grado }))}
        onChange={(v) => set({ grado: v ? Number(v) : undefined, grupo: undefined })}
      />
      <ComboOpciones
        id="cul-grupo"
        label="Grupo"
        todos="Todos"
        size="sm"
        value={search.grupo ?? ""}
        options={grupos.map((g) => ({ value: g.codigo, label: g.codigo }))}
        onChange={(v) => set({ grupo: v || undefined })}
      />
    </>
  )
}
