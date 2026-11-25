"use no memo"

import type { ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { SpinnerIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInformesReportesRoute } from "@/router"

import {
  useGruposAdmisionQuery,
  useListaCoberturaQuery,
  useListaSorteoQuery,
  useResumenCoberturaQuery,
} from "@/features/coverage/informes-reportes/api/cobertura"

type Fila = Record<string, string | number | null>
interface Columna {
  key: string
  label: string
  /** Numérica: centrada y sumada en la fila Total. */
  num?: boolean
}

const fecha = (v: unknown) => (typeof v === "string" && v ? v.slice(0, 10).split("-").reverse().join("/") : "—")
const centro = "px-3 py-2 text-center tabular-nums"

function Cargando() {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
      <SpinnerIcon className="animate-spin" /> Cargando…
    </div>
  )
}

/** Tabla de resumen con fila Total (C.4.COB.1, 4 y 6). */
function TablaResumen({ filas, columnas, vacio }: { filas: Fila[]; columnas: Columna[]; vacio: string }) {
  if (!filas.length) return <p className="p-10 text-center text-sm text-muted-foreground">{vacio}</p>
  const primeraNum = columnas.findIndex((c) => c.num)
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            {columnas.map((c) => (
              <th key={c.key} className={c.num ? `${centro} font-medium` : "px-3 py-2 font-medium"}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t border-border">
              {columnas.map((c) => (
                <td key={c.key} className={c.num ? centro : "px-3 py-2"}>
                  {c.num ? Number(f[c.key] ?? 0) : (f[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-border bg-muted/30 font-semibold">
            <td className="px-3 py-2" colSpan={Math.max(primeraNum, 1)}>
              Total
            </td>
            {columnas.slice(Math.max(primeraNum, 1)).map((c) => (
              <td key={c.key} className={c.num ? centro : "px-3 py-2"}>
                {c.num ? filas.reduce((t, f) => t + Number(f[c.key] ?? 0), 0) : ""}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Resumen({
  encabezado,
  informe,
  columnas,
  vacio,
  agrupar,
}: {
  encabezado: ReactNode
  informe: "cupos" | "inscripciones" | "demanda"
  columnas: Columna[]
  vacio: string
  /** Agrupa las filas por esta columna cuando trae más de un valor (C.4.COB.1a). */
  agrupar?: { key: string; label: string }
}) {
  const search = coberturaInformesReportesRoute.useSearch()
  const { data, isPending, isError, error } = useResumenCoberturaQuery(informe, search)
  let filas = data ?? []
  let cols = columnas
  if (agrupar && new Set(filas.map((f) => f[agrupar.key])).size > 1) {
    const grupos = new Map<string, Fila>()
    for (const f of filas) {
      const k = String(f[agrupar.key])
      const g = grupos.get(k) ?? { [agrupar.key]: k }
      for (const c of columnas) if (c.num) g[c.key] = Number(g[c.key] ?? 0) + Number(f[c.key] ?? 0)
      grupos.set(k, g)
    }
    filas = [...grupos.values()]
    cols = [{ key: agrupar.key, label: agrupar.label }, ...columnas.filter((c) => c.num)]
  }
  return (
    <TableScreen>
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        {isPending ? <Cargando /> : isError ? <p className="p-10 text-center text-sm text-red">{getErrorMessage(error)}</p> : <TablaResumen filas={filas} columnas={cols} vacio={vacio} />}
      </TableScreenBody>
    </TableScreen>
  )
}

/** Cupos frente a reservas (C.4.COB.1 y 1a). */
export function InformeCupos({ encabezado }: { encabezado: ReactNode }) {
  return (
    <Resumen
      encabezado={encabezado}
      informe="cupos"
      vacio="No hay grados para estos filtros."
      agrupar={{ key: "establecimiento", label: "Establecimiento" }}
      columnas={[
        { key: "grado", label: "Grado" },
        { key: "sede", label: "Sede" },
        { key: "jornada", label: "Jornada" },
        { key: "cupos", label: "Cupos", num: true },
        { key: "reservadas", label: "Reservadas", num: true },
        { key: "matriculadas", label: "Matriculadas", num: true },
        { key: "disponibles", label: "Disponibles", num: true },
        { key: "listaEspera", label: "En lista de espera", num: true },
      ]}
    />
  )
}

/** Inscripciones por grado (C.4.COB.4). */
export function InformeInscripciones({ encabezado }: { encabezado: ReactNode }) {
  return (
    <Resumen
      encabezado={encabezado}
      informe="inscripciones"
      vacio="No hay inscripciones para estos filtros."
      columnas={[
        { key: "grado", label: "Grado" },
        { key: "pendientes", label: "Pendientes", num: true },
        { key: "listaEspera", label: "En lista de espera", num: true },
        { key: "admitidas", label: "Admitidas", num: true },
        { key: "noAdmitidas", label: "No admitidas", num: true },
        { key: "descartadas", label: "Descartadas", num: true },
        { key: "porElegir", label: "Inscripciones por elegir", num: true },
        { key: "total", label: "Total opciones", num: true },
      ]}
    />
  )
}

/** Demanda no atendida (C.4.COB.6; Regla 50). */
export function InformeDemanda({ encabezado }: { encabezado: ReactNode }) {
  return (
    <Resumen
      encabezado={encabezado}
      informe="demanda"
      vacio="No hay demanda no atendida para estos filtros."
      columnas={[
        { key: "grado", label: "Grado" },
        { key: "modalidad", label: "Modalidad" },
        { key: "municipio", label: "Municipio" },
        { key: "establecimientoOrigen", label: "Establecimiento de origen" },
        { key: "enRedistribucion", label: "En redistribución", num: true },
        { key: "sinCupo", label: "Sin cupo en la plataforma", num: true },
        { key: "total", label: "Total", num: true },
      ]}
    />
  )
}

const COLOR_ESTADO: Record<string, "warning" | "success" | "destructive" | "neutral" | "info"> = {
  Pendiente: "warning",
  Aceptado: "success",
  Rechazado: "destructive",
  Cancelado: "neutral",
}

function col(key: string, label: string, cell?: (f: Fila) => ReactNode): ColumnDef<Fila> {
  return {
    id: key,
    accessorFn: (f) => f[key],
    meta: { label },
    header: ({ column }) => <DataTableColumnHeader column={column} title={label} />,
    cell: ({ row }) => (cell ? cell(row.original) : (row.original[key] ?? "—")),
    enableSorting: false,
  }
}

const COLUMNAS_LISTA: Record<"reservas-confirmar" | "traslados", ColumnDef<Fila>[]> = {
  "reservas-confirmar": [
    col("estudiante", "Estudiante", (f) => <span className="font-medium">{f.estudiante}</span>),
    col("grado", "Grado reservado"),
    col("sede", "Sede y jornada", (f) => `${f.sede} · ${f.jornada}`),
    col("origen", "Origen", (f) => (
      <Badge variant="soft" color="info" className="text-xs">
        {f.origen}
      </Badge>
    )),
    col("creada", "Creada", (f) => fecha(f.creada)),
    col("diasSinConfirmar", "Días sin confirmar", (f) => <span className="block text-center tabular-nums">{f.diasSinConfirmar}</span>),
    col("acudiente", "Acudiente"),
  ],
  traslados: [
    col("estudiante", "Estudiante", (f) => <span className="font-medium">{f.estudiante}</span>),
    col("direccion", "Dirección", (f) => (
      <Badge variant="soft" color="info" className="text-xs">
        {f.direccion === "SALIENTE" ? "Saliente" : "Entrante"}
      </Badge>
    )),
    col("origen", "Origen"),
    col("destino", "Destino"),
    col("grado", "Grado"),
    col("estado", "Estado", (f) => (
      <Badge variant="soft" color={COLOR_ESTADO[String(f.estado)] ?? "neutral"} className="text-xs">
        {f.estado}
      </Badge>
    )),
    col("solicitado", "Solicitado", (f) => fecha(f.solicitado)),
    col("respondido", "Respondido", (f) => fecha(f.respondido)),
  ],
}

/** Reservas por confirmar (C.4.COB.2) y Traslados (C.4.COB.3): listas paginadas. */
export function InformeListaCobertura({ encabezado, informe }: { encabezado: ReactNode; informe: "reservas-confirmar" | "traslados" }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useListaCoberturaQuery(informe, search, { pageIndex, pageSize })
  const { table } = useDataTable({
    columns: COLUMNAS_LISTA[informe],
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (f) => String(f.reservaId),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: `table-informes-${informe}`,
  })
  return (
    <TableScreen>
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage={informe === "traslados" ? "No hay traslados para estos filtros." : "No hay reservas por confirmar."}
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
    </TableScreen>
  )
}

/** Lista del sorteo (C.4.COB.5; Regla 53): publicable, sin datos personales. */
export function InformeListaSorteo({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const { data: grupos = [] } = useGruposAdmisionQuery()
  const { data, isFetching, isError, error } = useListaSorteoQuery(search, search.grado != null ? String(search.grado) : null)
  const grupo = grupos.find((g) => g.id === search.grupoAdmision)
  const filas = data?.rows ?? []
  return (
    <TableScreen>
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        {!search.grupoAdmision || search.grado == null || !search.jornada ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Elija la jornada, el grado y el grupo de admisión.</p>
        ) : isFetching ? (
          <Cargando />
        ) : isError ? (
          <p className="p-10 text-center text-sm text-red">{getErrorMessage(error)}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {grupo?.sorteoEjecutadoAt
                ? `Sorteo ejecutado el ${fecha(grupo.sorteoEjecutadoAt)} a las ${grupo.sorteoEjecutadoAt.slice(11, 16)}. La semilla está en la Bitácora para auditoría.`
                : "El sorteo de este grupo de admisión aún no se ha ejecutado."}
            </p>
            {filas.length ? (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className={`${centro} font-medium`}>Posición</th>
                      <th className="px-3 py-2 font-medium">Inscripción</th>
                      <th className="px-3 py-2 font-medium">Grupo de prioridad</th>
                      <th className={`${centro} font-medium`}>Número de sorteo</th>
                      <th className="px-3 py-2 font-medium">Estado de la opción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f) => (
                      <tr key={f.posicion} className="border-t border-border">
                        <td className={centro}>{f.posicion}</td>
                        <td className="px-3 py-2 tabular-nums">{f.numeroInscripcion}</td>
                        <td className="px-3 py-2">{f.prioridad || "Sin prioridad"}</td>
                        <td className={centro}>{f.numeroSorteo ?? "—"}</td>
                        <td className="px-3 py-2">{f.estadoOpcion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-10 text-center text-sm text-muted-foreground">No hay inscripciones en este grado y jornada.</p>
            )}
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
