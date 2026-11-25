"use no memo"

import { useEffect, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenToolbar } from "@/components/layout/table-screen"
import { Pagination } from "@/components/pagination"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EyeIcon, FileTextIcon, XIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInformesReportesRoute } from "@/router"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { fetchGrados, fetchGrupos } from "@/features/coverage/matricula/api/query/use-matricula-dependent-catalogs-query"
import { useMatriculaStatusOptionsQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { AGE_SITUATION_LABELS, MarcaComplementaria, MatriculaStatusBadge } from "@/features/coverage/matricula/components/table/columns-matricula"
import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"
import { informesKeys, useMatriculadosQuery, usePeriodosInformeQuery, type Matriculado } from "@/features/coverage/informes-reportes/api/informes"
import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"
import { CertificadoCalificacionesDialog } from "@/features/coverage/informes-reportes/components/certificado-calificaciones-dialog"

const unicos = (valores: (string | number | null)[]) =>
  [...new Set(valores.filter((v): v is string | number => v != null && v !== ""))]

// Preescolar (grados 0 y anteriores) es de enfoque formativo: sin certificado de calificaciones (Regla 59).
const esFormativo = (m: Matriculado) => m.grado <= 0

function columnas(gradeLabel: (g: number) => string, onCertificado: (m: Matriculado) => void): ColumnDef<Matriculado>[] {
  return [
    {
      id: "documentNumber",
      accessorFn: (m) => m.documento,
      meta: { label: "Documento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.documento}</span>,
    },
    {
      id: "lastName",
      accessorFn: (m) => `${m.apellidos} ${m.nombres}`,
      meta: { label: "Estudiante" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1">
          <span className="font-medium">{`${row.original.apellidos} ${row.original.nombres}`}</span>
          <MarcaComplementaria matricula={row.original} />
        </div>
      ),
      enableHiding: false,
    },
    {
      id: "periodo",
      accessorFn: (m) => `${m.anio ?? ""} ${m.periodo}`,
      meta: { label: "Año y período" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Año y período" />,
      cell: ({ row }) => [row.original.anio, row.original.periodo].filter(Boolean).join(" · "),
      enableSorting: false,
    },
    {
      id: "campus",
      accessorFn: (m) => m.sede,
      meta: { label: "Sede y jornada" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sede y jornada" />,
      cell: ({ row }) => `${row.original.sede} · ${row.original.jornada}`,
    },
    {
      id: "grade",
      accessorFn: (m) => m.grado,
      meta: { label: "Grado y grupo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grado y grupo" />,
      cell: ({ row }) => `${gradeLabel(row.original.grado)} · ${row.original.grupo}`,
    },
    {
      id: "status",
      accessorFn: (m) => m.estado,
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => <MatriculaStatusBadge status={`${row.original.estado} (${row.original.estado.slice(0, 3)})`} />,
    },
    {
      id: "situacionEdad",
      accessorFn: (m) => m.situacionEdad,
      meta: { label: "Edad" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Edad" />,
      cell: ({ row }) => AGE_SITUATION_LABELS[row.original.situacionEdad],
      enableSorting: false,
    },
    {
      id: "metodologia",
      accessorFn: (m) => m.metodologia,
      meta: { label: "Metodología" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Metodología" />,
      cell: ({ row }) => row.original.metodologia,
      enableSorting: false,
    },
    {
      id: "nuevo",
      accessorFn: (m) => (m.nuevo ? "Sí" : "No"),
      meta: { label: "Nuevo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nuevo" />,
      cell: ({ row }) => (row.original.nuevo ? <Badge variant="soft" color="info" className="text-xs">Nuevo</Badge> : "No"),
      enableSorting: false,
    },
    {
      id: "actions",
      size: 96,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                render={<Link to={paths.app.coberturaInformesMatricula.getHref(row.original.id)} />}
                nativeButton={false}
                variant="ghost"
                color="neutral"
                size="icon-sm"
                aria-label="Ver detalle"
              />
            }
          >
            <EyeIcon />
          </TooltipTrigger>
          <TooltipContent>Ver detalle</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              // Deshabilitado no recibe el hover: el span lleva el texto emergente.
              <span>
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label="Generar certificado de calificaciones"
                  disabled={esFormativo(row.original)}
                  onClick={() => onCertificado(row.original)}
                >
                  <FileTextIcon />
                </Button>
              </span>
            }
          />
          <TooltipContent>
            {esFormativo(row.original)
              ? "Los grados de enfoque formativo no tienen certificado de calificaciones."
              : "Generar certificado de calificaciones"}
          </TooltipContent>
        </Tooltip>
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
    },
  ]
}

const TIPOS = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "COMPLEMENTARIA", label: "Complementaria" },
]
const EDADES = Object.entries(AGE_SITUATION_LABELS).map(([value, label]) => ({ value, label }))

type Borrador = Omit<InformesSearch, "informe" | "page" | "pageSize">
// Cada campo de la cascada limpia los que dependen de él.
const CASCADA = ["sede", "anio", "jornada", "periodo", "grado", "grupo"] as const

/**
 * Consulta de matriculados (Cobertura 3.9; Regla 55): matrículas de todos los
 * períodos del alcance, Abiertos y Cerrados, sin Anuladas. Solo consulta.
 */
export function ConsultaMatriculados({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const gradeLabel = useMatriculaGradeLabel()
  const [certificado, setCertificado] = useState<Matriculado | null>(null)
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useMatriculadosQuery(search, { pageIndex, pageSize, sorting })
  const { table } = useDataTable({
    columns: columnas(gradeLabel, setCertificado),
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (m) => m.id,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-informes-matriculados",
    initialColumnVisibility: { metodologia: false, nuevo: false },
  })

  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState(search.q ?? "")
  const [b, setB] = useState<Borrador>(search)
  useEffect(() => {
    if (abierto) setB(search)
  }, [abierto, search])

  const { data: periodos = [] } = usePeriodosInformeQuery()
  const { data: estados = [] } = useMatriculaStatusOptionsQuery()
  const { data: grados = [] } = useQuery({
    queryKey: [...informesKeys.all, "grados", b.periodo ?? "none"] as const,
    queryFn: () => fetchGrados(b.periodo ?? 0),
    enabled: Boolean(b.periodo),
  })
  const gradoId = grados.find((g) => g.valor === b.grado)?.id
  const { data: grupos = [] } = useQuery({
    queryKey: [...informesKeys.all, "grupos", gradoId ?? "none", b.jornada ?? ""] as const,
    queryFn: () => fetchGrupos(gradoId ?? 0, b.jornada),
    enabled: Boolean(gradoId),
  })

  // Sede, Año, Jornada y Período salen de los períodos del alcance (Abiertos y Cerrados).
  const enSede = periodos.filter((p) => !b.sede || p.sede === b.sede)
  const enAnio = enSede.filter((p) => !b.anio || p.anio === b.anio)
  const enJornada = enAnio.filter((p) => !b.jornada || p.jornada === b.jornada)
  const opciones = (vs: (string | number)[]) => vs.map((v) => ({ value: String(v), label: String(v) }))

  function setCascada(key: (typeof CASCADA)[number], valor: string) {
    const i = CASCADA.indexOf(key)
    setB((prev) => {
      const next: Borrador = { ...prev, [key]: valor === "" ? undefined : ["anio", "periodo", "grado"].includes(key) ? Number(valor) : valor }
      for (const dep of CASCADA.slice(i + 1)) next[dep] = undefined
      return next
    })
  }
  const set = (key: keyof Borrador, valor: string | number | undefined) => setB((prev) => ({ ...prev, [key]: valor === "" ? undefined : valor }))

  function aplicar(filtros: Borrador) {
    navigate({ search: (prev) => ({ informe: prev.informe, ...filtros, q: texto || undefined, page: 0, pageSize: prev.pageSize }), replace: true })
    setAbierto(false)
  }

  function limpiar() {
    setTexto("")
    navigate({ search: (prev) => ({ informe: prev.informe, page: 0, pageSize: prev.pageSize }), replace: true })
    setAbierto(false)
  }
  // Quitar un chip limpia también lo que cuelga de él en la cascada.
  function quitar(claves: (keyof Borrador)[]) {
    navigate({
      search: (prev) => ({ ...prev, ...Object.fromEntries(claves.map((k) => [k, undefined])), page: 0 }),
      replace: true,
    })
  }
  const desde = (key: (typeof CASCADA)[number]) => CASCADA.slice(CASCADA.indexOf(key))
  const periodoSel = periodos.find((p) => p.id === search.periodo)
  type Chip = { key: string; label: string; claves: (keyof Borrador)[] }
  // Chips como C.4.CON.1: período con su estado, sede · jornada, grado, grupo y el resto.
  const chips = [
    periodoSel && {
      key: "periodo",
      label: `${[periodoSel.anio, periodoSel.nombre].filter(Boolean).join(" · ")}${periodoSel.estado === "CERRADO" ? " (Cerrado)" : ""}`,
      claves: desde("periodo"),
    },
    !periodoSel && search.anio && { key: "anio", label: String(search.anio), claves: desde("anio") },
    search.sede && {
      key: "sede",
      label: search.jornada ? `${search.sede} · ${search.jornada}` : search.sede,
      claves: desde("sede"),
    },
    !search.sede && search.jornada && { key: "jornada", label: search.jornada, claves: desde("jornada") },
    search.grado != null && { key: "grado", label: gradeLabel(search.grado), claves: desde("grado") },
    search.grupo && { key: "grupo", label: `Grupo ${search.grupo}`, claves: ["grupo"] },
    search.estado && { key: "estado", label: search.estado, claves: ["estado"] },
    search.tipo && { key: "tipo", label: search.tipo === "COMPLEMENTARIA" ? "Complementaria" : "Principal", claves: ["tipo"] },
    search.edad && { key: "edad", label: AGE_SITUATION_LABELS[search.edad], claves: ["edad"] },
  ].filter((c): c is Chip => Boolean(c))

  const activos = Object.entries(search).filter(([k, v]) => !["informe", "page", "pageSize"].includes(k) && v != null && v !== "").length
  const total = data?.totalEstudiantes ?? 0

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <TableScreenToolbar>
          <SearchQueryBar
            id="informes-matriculados-buscar"
            placeholder="Buscar por nombre o documento"
            value={texto}
            onValueChange={(v) => {
              setTexto(v)
              navigate({ search: (prev) => ({ ...prev, q: v || undefined, page: 0 }), replace: true })
            }}
            onClearAll={limpiar}
            activeFilterCount={activos}
            badgeCount={activos - (search.q ? 1 : 0)}
            open={abierto}
            onOpenChange={setAbierto}
            onApply={() => aplicar(b)}
            size="lg"
          >
            <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2">
              <ComboOpciones id="inf-sede" label="Sede" todos="Todas" value={b.sede ?? ""} options={opciones(unicos(periodos.map((p) => p.sede)))} onChange={(v) => setCascada("sede", v)} />
              <ComboOpciones id="inf-anio" label="Año" value={b.anio ? String(b.anio) : ""} options={opciones(unicos(enSede.map((p) => p.anio)).sort((x, y) => Number(y) - Number(x)))} onChange={(v) => setCascada("anio", v)} />
              <ComboOpciones id="inf-jornada" label="Jornada" todos="Todas" value={b.jornada ?? ""} options={opciones(unicos(enAnio.map((p) => p.jornada)))} onChange={(v) => setCascada("jornada", v)} />
              <ComboOpciones
                id="inf-periodo"
                label="Período académico"
                value={b.periodo ? String(b.periodo) : ""}
                options={enJornada.map((p) => ({
                  value: String(p.id),
                  label: `${p.nombre}${b.sede ? "" : ` · ${p.sede}`}${b.jornada ? "" : ` · ${p.jornada}`}${p.estado === "CERRADO" ? " (Cerrado)" : ""}`,
                }))}
                onChange={(v) => setCascada("periodo", v)}
              />
              <ComboOpciones
                id="inf-grado"
                label="Grado"
                value={b.grado != null ? String(b.grado) : ""}
                options={grados.map((g) => ({ value: String(g.valor), label: g.nombre }))}
                onChange={(v) => setCascada("grado", v)}
                disabled={!b.periodo}
                placeholder={b.periodo ? undefined : "Elija el período primero"}
              />
              <ComboOpciones
                id="inf-grupo"
                label="Grupo"
                value={b.grupo ?? ""}
                options={grupos.map((g) => ({ value: g.codigo, label: g.codigo }))}
                onChange={(v) => setCascada("grupo", v)}
                disabled={!gradoId}
                placeholder={gradoId ? undefined : "Elija el grado primero"}
              />
              <ComboOpciones id="inf-estado" label="Estado de la matrícula" value={b.estado ?? ""} options={estados} onChange={(v) => set("estado", v)} />
              <ComboOpciones id="inf-tipo" label="Tipo de matrícula" todos="Todas" value={b.tipo ?? ""} options={TIPOS} onChange={(v) => set("tipo", v)} />
              <ComboOpciones id="inf-edad" label="Situación de edad" todos="Todas" value={b.edad ?? ""} options={EDADES} onChange={(v) => set("edad", v)} />
            </div>
          </SearchQueryBar>
          {chips.length > 0 ? (
            <div className="flex w-full flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Badge key={chip.key} variant="soft" color="info" className="text-xs font-medium tracking-normal">
                  {chip.label}
                  <button
                    type="button"
                    aria-label={`Quitar filtro ${chip.label}`}
                    className="rounded-xs hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onClick={() => quitar(chip.claves)}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </Badge>
              ))}
              <Button type="button" variant="link" color="primary" size="sm" onClick={limpiar}>
                <XIcon data-icon="inline-start" />
                Limpiar filtros
              </Button>
            </div>
          ) : null}
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        {data ? (
          <p className="mb-3 text-sm font-medium tabular-nums">
            {total === 1 ? "1 estudiante" : `${total.toLocaleString("es-CO")} estudiantes`}
          </p>
        ) : null}
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage="No hay matrículas que coincidan con los filtros."
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
      {certificado ? (
        <CertificadoCalificacionesDialog
          matriculaId={certificado.id}
          resumen={[
            `${certificado.nombres} ${certificado.apellidos}`,
            gradeLabel(certificado.grado),
            certificado.grupo,
            certificado.anio,
            certificado.estado,
          ]
            .filter(Boolean)
            .join(" · ")}
          onOpenChange={(o) => !o && setCertificado(null)}
        />
      ) : null}
    </TableScreen>
  )
}
