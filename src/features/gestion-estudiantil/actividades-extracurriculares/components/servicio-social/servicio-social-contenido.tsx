"use no memo"

import { useMemo, useState } from "react"
import type { Column, ColumnDef, SortingState } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileTextIcon, InfoIcon } from "@/components/ui/icons"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { BotonVolver } from "@/features/gestion-estudiantil/prevencion/components/boton-volver"
import type {
  ServicioSocialDetalle,
  ServicioSocialSesion,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import {
  ESTADO_SERVICIO_SOCIAL_COLOR,
  ESTADO_SERVICIO_SOCIAL_ETIQUETA,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/ui-mappings"
import { DialogoCertificado } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/dialogos/dialogo-certificado"
import { useNavegacionActividades } from "@/features/gestion-estudiantil/actividades-extracurriculares/hooks/use-navegacion-actividades"
import { formatHoras, formatNumero } from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/formatos-actividad"

const NOOP = () => {}

// El historial llega completo y se ordena en el cliente (ver `ordenar`).
const columna = (id: string, titulo: string, className?: string) => ({
  id,
  enableSorting: true,
  meta: { label: titulo },
  header: ({ column }: { column: Column<ServicioSocialSesion> }) => (
    <DataTableColumnHeader column={column} title={titulo} className={className} />
  ),
})

const COMPARADORES: Record<string, (a: ServicioSocialSesion, b: ServicioSocialSesion) => number> = {
  fecha: (a, b) => a.fecha.localeCompare(b.fecha),
  actividad: (a, b) =>
    a.actividad.localeCompare(b.actividad, "es") || (a.entidad_externa ?? "").localeCompare(b.entidad_externa ?? "", "es"),
  horas: (a, b) => a.horas - b.horas,
  responsable: (a, b) => a.responsable.localeCompare(b.responsable, "es"),
}

/** Ordena las sesiones según el orden elegido; sin orden, como llegan (Fecha descendente). */
function ordenar(sesiones: ServicioSocialSesion[], sorting: SortingState): ServicioSocialSesion[] {
  const cmp = sorting[0] ? COMPARADORES[sorting[0].id] : undefined
  if (!cmp) return sesiones
  const signo = sorting[0].desc ? -1 : 1
  return [...sesiones].sort((a, b) => signo * cmp(a, b))
}

/** Columnas del historial (G.5.SOC.DET.1): Fecha · Actividad o entidad externa · Horas · Responsable. */
function columnas(): ColumnDef<ServicioSocialSesion>[] {
  return [
    { ...columna("fecha", "Fecha"), accessorFn: (f) => formatFecha(f.fecha) },
    {
      ...columna("actividad", "Actividad o entidad externa"),
      accessorFn: (f) => (f.entidad_externa ? `${f.actividad} · Entidad externa: ${f.entidad_externa}` : f.actividad),
      cell: ({ row }) => (
        <span className="whitespace-normal">
          {row.original.actividad}
          {row.original.entidad_externa && (
            <span className="text-muted-foreground"> · Entidad externa: {row.original.entidad_externa}</span>
          )}
        </span>
      ),
    },
    {
      ...columna("horas", "Horas", "justify-end"),
      accessorFn: (f) => formatHoras(f.horas),
      cell: ({ row }) => <span className="block text-right tabular-nums">{formatHoras(row.original.horas)}</span>,
    },
    { ...columna("responsable", "Responsable"), accessorFn: (f) => abreviarPersona(f.responsable) },
  ]
}

/** Detalle del servicio social de un estudiante (G.5.SOC.DET.1): avance de horas e historial de sesiones. */
export function ServicioSocialContenido({ detalle: d }: { detalle: ServicioSocialDetalle }) {
  const { irListado } = useNavegacionActividades()
  const [certificado, setCertificado] = useState(false)
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const cols = useMemo(() => columnas(), [])
  // El detalle trae todo el historial: se pagina en el cliente.
  const pagina = useMemo(
    () => ordenar(d.sesiones, sorting).slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [d.sesiones, sorting, pageIndex, pageSize],
  )
  const pageCount = Math.max(1, Math.ceil(d.sesiones.length / pageSize))
  const { table } = useDataTable({
    columns: cols,
    data: pagina,
    pageCount,
    getRowId: (row) => `${row.fecha}-${row.actividad}-${row.horas}-${row.responsable}`,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "servicio-social-historial-column-visibility",
  })

  const cumplido = d.estado === "CUMPLIDO"
  const faltan = Math.max(d.faltan, 0)

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          ruta="Servicio social"
          action={
            <Tooltip>
              <TooltipTrigger render={<span tabIndex={0} />}>
                {/* puede_certificar ya incluye el Cumplido (backend); el estado solo elige el texto del tooltip. */}
                <Button size="sm" type="button" disabled={!d.puede_certificar} onClick={() => setCertificado(true)}>
                  <FileTextIcon data-icon="inline-start" />
                  Certificado de servicio social
                </Button>
              </TooltipTrigger>
              {!d.puede_certificar && (
                <TooltipContent>
                  {cumplido
                    ? "Solo el Supervisor de sede o el Administrador del establecimiento pueden certificar el servicio social"
                    : "Disponible cuando el servicio social esté cumplido"}
                </TooltipContent>
              )}
            </Tooltip>
          }
          description={<BotonVolver onClick={() => irListado("servicio-social")} />}
        >
          <span className="inline-flex flex-wrap items-center gap-2">
            {d.estudiante} · {d.grado_grupo}
            <Badge variant="soft" color={ESTADO_SERVICIO_SOCIAL_COLOR[d.estado]}>
              <span>{ESTADO_SERVICIO_SOCIAL_ETIQUETA[d.estado]}</span>
            </Badge>
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>
      <TableScreenBody>
        <div className="flex flex-col gap-4 pb-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Progress
              value={Math.min(d.horas, d.horas_requeridas)}
              max={d.horas_requeridas || 1}
              className="w-64 shrink-0"
            />
            <div className="flex items-center gap-2 text-sm">
              <strong className="font-semibold tabular-nums">
                {formatNumero(d.horas)} de {formatNumero(d.horas_requeridas)} horas
              </strong>
              {!cumplido && <span className="text-muted-foreground">· le faltan {formatNumero(faltan)}</span>}
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} aria-label="Cómo se calculan las horas" />}>
                  <InfoIcon className="size-4 text-muted-foreground" aria-hidden />
                </TooltipTrigger>
                <TooltipContent>
                  Suma las horas de las sesiones de servicio social de todas sus matrículas en los Grados del servicio
                  social (Regla 30).
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <DataTable
            table={table}
            isPending={false}
            isError={false}
            onRetry={NOOP}
            emptyMessage="El estudiante aún no tiene horas de servicio social."
          />
          <Pagination
            pageIndex={pageIndex}
            pageCount={pageCount}
            canPrev={pageIndex > 0}
            canNext={pageIndex < pageCount - 1}
            onPageChange={goToPage}
            totalCount={d.sesiones.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            viewOptions={<DataTableViewOptions table={table} />}
          />
        </div>
      </TableScreenBody>
      {certificado && <DialogoCertificado matricula={d.id} onClose={() => setCertificado(false)} />}
    </>
  )
}
