"use no memo"

import { useState, type ReactNode } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { Pagination } from "@/components/pagination"
import { SpinnerIcon } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { coberturaInformesReportesRoute } from "@/router"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { useMatriculaStatusOptionsQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { AGE_SITUATION_LABELS } from "@/features/coverage/matricula/components/table/columns-matricula"
import type { AgeSituation } from "@/features/coverage/matricula/api/types/matricula"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"
import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"
import { filtrosEdades } from "@/features/coverage/informes-reportes/api/edades"

// Estadística de edades (C.4.EDA; Sección 3.9, Regla 79).

interface Conteo {
  grupo: string
  orden: number | null
  edadRecomendada: number | null
  edad: number | null
  genero: string | null
  situacion: AgeSituation
  cantidad: number
}

const AGRUPAR = [
  { value: "GRADO", label: "Grado" },
  { value: "GRUPO", label: "Grupo" },
  { value: "SEDE", label: "Sede" },
  { value: "JORNADA", label: "Jornada" },
  { value: "METODOLOGIA", label: "Metodología" },
  { value: "ESTABLECIMIENTO", label: "Establecimiento" },
]
const SITUACIONES: AgeSituation[] = ["BAJA_EDAD", "EN_EDAD", "PREEXTRAEDAD", "EXTRAEDAD"]

const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0)
const celda = (n: number, t: number) => (n ? `${n} · ${pct(n, t)} %` : "—")
const centro = "px-3 py-2 text-center tabular-nums"

/** Columnas «Automático»: de la menor edad recomendada − 2 a la mayor + 2, con los extremos abiertos. */
function columnasEdad(conteos: Conteo[]) {
  const recs = conteos.map((c) => c.edadRecomendada).filter((e): e is number => e != null)
  const edades = conteos.map((c) => c.edad).filter((e): e is number => e != null)
  if (!edades.length) return { desde: 0, hasta: -1 }
  const desde = recs.length ? Math.min(...recs) - 2 : Math.min(...edades)
  const hasta = recs.length ? Math.max(...recs) + 2 : Math.max(...edades)
  return { desde, hasta }
}

function columnaDe(edad: number | null, desde: number, hasta: number) {
  if (edad == null) return "sin"
  return String(Math.min(Math.max(edad, desde), hasta))
}

function mediana(valores: { edad: number; n: number }[]) {
  const total = valores.reduce((t, v) => t + v.n, 0)
  if (!total) return null
  let acum = 0
  for (const v of [...valores].sort((a, b) => a.edad - b.edad)) {
    acum += v.n
    if (acum >= total / 2) return v.edad
  }
  return null
}

export function EstadisticaEdades({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const { data: estados = [] } = useMatriculaStatusOptionsQuery()
  const [incluir, setIncluir] = useState(false)
  const [genero, setGenero] = useState(false)
  const [pagina, setPagina] = useState({ pageIndex: 0, pageSize: 10 })

  const body = filtrosEdades(search)
  const { data: conteos = [], isPending, isError, error } = useQuery({
    queryKey: [...informesKeys.all, "edades", body] as const,
    queryFn: async () =>
      camelizar<Conteo[]>(await evalCol.postRows("/informes-reportes/edades/query", body)).map((c) => ({ ...c, cantidad: Number(c.cantidad) })),
    placeholderData: keepPreviousData,
  })

  const grupos = [...new Map(conteos.map((c) => [c.grupo, c])).values()]
    .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99) || a.grupo.localeCompare(b.grupo))
    .map((c) => c.grupo)
  const { desde, hasta } = columnasEdad(conteos)
  const cols = [
    ...Array.from({ length: Math.max(hasta - desde + 1, 0) }, (_, i) => {
      const e = desde + i
      return { key: String(e), label: i === 0 ? `${e} años o menos` : e === hasta ? `${e} años o más` : `${e} años` }
    }),
    { key: "sin", label: "Sin calcular" },
  ]
  const de = (g: string | null) => conteos.filter((c) => g == null || c.grupo === g)
  const total = (cs: Conteo[]) => cs.reduce((t, c) => t + c.cantidad, 0)
  const enCol = (cs: Conteo[], k: string) => total(cs.filter((c) => columnaDe(c.edad, desde, hasta) === k))
  const filasResumen = [...grupos, null]

  const set = (k: keyof InformesSearch, v: string) =>
    navigate({ search: (prev) => ({ ...prev, [k]: v || undefined, grupoEdad: undefined, page: 0 }), replace: true })

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <div className="flex flex-wrap items-end gap-3 px-(--screen-spacing) pb-4">
          <div className="w-56">
            <ComboOpciones id="eda-estado" label="Estado" size="sm" value={search.estado ?? ""} options={estados} onChange={(v) => set("estado", v)} />
          </div>
          <div className="w-56">
            <ComboOpciones id="eda-agrupar" label="Agrupar por" size="sm" todos={false} value={search.agrupar ?? "GRADO"} options={AGRUPAR} onChange={(v) => set("agrupar", v)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={incluir} onCheckedChange={setIncluir} /> Incluir estudiantes
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={genero} onCheckedChange={setGenero} /> Resumen por género
          </label>
        </div>
      </TableScreenHeader>
      <TableScreenBody>
        {isPending ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <SpinnerIcon className="animate-spin" /> Cargando…
          </div>
        ) : isError ? (
          <p className="p-10 text-center text-sm text-red">{getErrorMessage(error)}</p>
        ) : !conteos.length ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No hay estudiantes para estos filtros.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <Tabla
              cabecera={[AGRUPAR.find((a) => a.value === (search.agrupar ?? "GRADO"))?.label ?? "Grado", ...cols.map((c) => c.label), "Total"]}
              filas={filasResumen.map((g) => {
                const cs = de(g)
                const t = total(cs)
                return [g ?? "Total", ...cols.map((c) => celda(enCol(cs, c.key), t)), String(t)]
              })}
            />
            <Tabla
              cabecera={["Grado", "Edad recomendada", "Mínima", "Máxima", "Promedio", "Mediana", ...SITUACIONES.map((s) => AGE_SITUATION_LABELS[s])]}
              filas={filasResumen.map((g) => {
                const cs = de(g)
                const t = total(cs)
                const con = cs.filter((c) => c.edad != null).map((c) => ({ edad: c.edad as number, n: c.cantidad }))
                const n = con.reduce((s, v) => s + v.n, 0)
                const rec = g ? cs[0]?.edadRecomendada : null
                return [
                  g ?? "Total",
                  rec != null ? `${rec} años` : "—",
                  n ? String(Math.min(...con.map((v) => v.edad))) : "—",
                  n ? String(Math.max(...con.map((v) => v.edad))) : "—",
                  n ? (con.reduce((s, v) => s + v.edad * v.n, 0) / n).toFixed(1).replace(".", ",") : "—",
                  String(mediana(con) ?? "—"),
                  ...SITUACIONES.map((s) => celda(total(cs.filter((c) => c.situacion === s)), t)),
                ]
              })}
            />
            {genero ? (
              <Tabla
                cabecera={["Grado", ...[...new Set(conteos.map((c) => c.genero ?? "Sin dato"))], "Total"]}
                filas={filasResumen.map((g) => {
                  const cs = de(g)
                  const t = total(cs)
                  const generos = [...new Set(conteos.map((c) => c.genero ?? "Sin dato"))]
                  return [g ?? "Total", ...generos.map((x) => celda(total(cs.filter((c) => (c.genero ?? "Sin dato") === x)), t)), String(t)]
                })}
              />
            ) : null}
            {incluir ? (
              <Estudiantes
                grupos={grupos}
                cols={cols}
                enCol={(k) => enCol(de(search.grupoEdad ?? grupos[0]), k)}
                pagina={pagina}
                setPagina={setPagina}
              />
            ) : null}
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}

function Tabla({ cabecera, filas }: { cabecera: string[]; filas: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            {cabecera.map((c, i) => (
              <th key={c} className={i === 0 ? "px-3 py-2 text-left font-medium" : `${centro} font-medium`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f[0]} className={i === filas.length - 1 ? "border-t border-border bg-muted/30 font-semibold" : "border-t border-border"}>
              {f.map((v, j) => (
                <td key={j} className={j === 0 ? "px-3 py-2" : centro}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface Estudiante {
  matriculaId: number
  documento: string
  estudiante: string
  fechaNacimiento: string | null
  edad: number | null
  grupoClave: string
  grupo: string
  situacion: AgeSituation
}

const columnasEstudiantes: ColumnDef<Estudiante>[] = [
  ["documento", "Documento"],
  ["estudiante", "Estudiante"],
  ["fechaNacimiento", "Fecha de nacimiento"],
  ["edad", "Edad"],
  ["grupo", "Grado y grupo"],
  ["situacion", "Situación de edad"],
].map(([key, label]) => ({
  id: key,
  accessorFn: (e: Estudiante) => e[key as keyof Estudiante],
  meta: { label },
  header: ({ column }) => <DataTableColumnHeader column={column} title={label} />,
  cell: ({ row }) => {
    const e = row.original
    if (key === "fechaNacimiento") return e.fechaNacimiento?.slice(0, 10).split("-").reverse().join("/") ?? "—"
    if (key === "grupo") return `${e.grupoClave} · ${e.grupo}`
    if (key === "situacion") return AGE_SITUATION_LABELS[e.situacion]
    return e[key as keyof Estudiante] ?? "—"
  },
  enableSorting: false,
}))

/** Incluir estudiantes (C.4.EDA.2): gráfico de barras de un grupo de la agrupación y su lista. */
function Estudiantes({
  grupos,
  cols,
  enCol,
  pagina,
  setPagina,
}: {
  grupos: string[]
  cols: { key: string; label: string }[]
  enCol: (k: string) => number
  pagina: { pageIndex: number; pageSize: number }
  setPagina: (p: { pageIndex: number; pageSize: number }) => void
}) {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const grupo = search.grupoEdad ?? grupos[0]
  const body = { ...filtrosEdades(search), GRUPO: grupo, PAGEINDEX: pagina.pageIndex, PAGESIZE: pagina.pageSize }
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: [...informesKeys.all, "edades-estudiantes", body] as const,
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>("/informes-reportes/edades/estudiantes/query", body)
      return toPaginated(rows, { pageSize: pagina.pageSize, map: (r) => camelizar<Estudiante>(r) })
    },
    placeholderData: keepPreviousData,
  })
  const { table } = useDataTable({
    columns: columnasEstudiantes,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (e) => String(e.matriculaId),
    pageIndex: pagina.pageIndex,
    pageSize: pagina.pageSize,
    goToPage: (pageIndex) => setPagina({ ...pagina, pageIndex }),
    setPageSize: (pageSize) => setPagina({ pageIndex: 0, pageSize }),
    sorting: [],
    setSorting: () => {},
  })
  const max = Math.max(...cols.map((c) => enCol(c.key)), 1)
  const totalGrupo = cols.reduce((t, c) => t + enCol(c.key), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <span className="text-sm font-semibold">Distribución de edades</span>
        <div className="w-56">
          <ComboOpciones
            id="eda-grupo"
            label="Grupo"
            size="sm"
            todos={false}
            value={grupo ?? ""}
            options={grupos.map((g) => ({ value: g, label: g }))}
            onChange={(v) => {
              setPagina({ ...pagina, pageIndex: 0 })
              navigate({ search: (prev) => ({ ...prev, grupoEdad: v || undefined }), replace: true })
            }}
          />
        </div>
        <span className="text-sm text-muted-foreground">{totalGrupo} estudiantes</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {cols.map((c) => (
          <div key={c.key} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-sm">
            <span>{c.label}</span>
            <div className="h-3 rounded-full bg-muted">
              <div className="h-3 rounded-full bg-primary" style={{ width: `${(enCol(c.key) / max) * 100}%` }} />
            </div>
            <span className="text-right tabular-nums">{enCol(c.key)}</span>
          </div>
        ))}
      </div>
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        errorMessage={error ? getErrorMessage(error) : undefined}
        emptyMessage="No hay estudiantes."
      />
      {data ? (
        <Pagination
          pageIndex={pagina.pageIndex}
          pageCount={data.pageCount}
          canPrev={pagina.pageIndex > 0}
          canNext={pagina.pageIndex < data.pageCount - 1}
          onPageChange={(pageIndex) => setPagina({ ...pagina, pageIndex })}
          totalCount={data.totalCount}
          pageSize={pagina.pageSize}
          onPageSizeChange={(pageSize) => setPagina({ pageIndex: 0, pageSize })}
        />
      ) : null}
    </div>
  )
}
