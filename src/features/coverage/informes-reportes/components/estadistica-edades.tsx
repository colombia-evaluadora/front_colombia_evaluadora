"use no memo"

import { useState, type ReactNode } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { MarcoOpciones } from "@/components/marco-opciones"
import { Pagination } from "@/components/pagination"
import { SelectOpciones } from "@/components/select-opciones"
import { TituloConAyuda } from "@/components/titulo-con-ayuda"
import { Field, FieldLabel } from "@/components/ui/field"
import { CaretDownIcon, CaretRightIcon, SpinnerIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { cn } from "@/lib/utils"
import { coberturaInformesReportesRoute } from "@/router"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { useContextoTerritorialQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { useMatriculaStatusOptionsQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { AGE_SITUATION_LABELS } from "@/features/coverage/matricula/components/table/columns-matricula"
import type { AgeSituation } from "@/features/coverage/matricula/api/types/matricula"
import { useGradosCatalogQuery, useMetodologiasQuery } from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import { informesKeys, usePeriodosInformeQuery } from "@/features/coverage/informes-reportes/api/informes"
import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"
import { ESTADOS_EDADES_DEFECTO, filtrosEdades } from "@/features/coverage/informes-reportes/api/edades"
import {
  abiertosHasta,
  armarArbol,
  celdasNodo,
  columnasEdades,
  filasVisibles,
  indexar,
  nivelesMaximos,
  rangoEdades,
  SITUACIONES,
  type ConteoEdad,
  type ModoColumnas,
  type NodoEdad,
} from "@/features/coverage/informes-reportes/lib/edades-tabla"

// Estadística de edades (C.4.EDA; Sección 3.9, Regla 79).

const AGRUPAR = [
  { value: "GRADO", label: "Grado" },
  { value: "GRUPO", label: "Grupo" },
  { value: "SEDE", label: "Sede" },
  { value: "JORNADA", label: "Jornada" },
  { value: "NIVEL", label: "Nivel de enseñanza" },
  { value: "METODOLOGIA", label: "Metodología" },
  { value: "ESTADO", label: "Estado de la matrícula" },
  { value: "ESTABLECIMIENTO", label: "Establecimiento" },
]
const COLUMNAS: { value: ModoColumnas; label: string }[] = [
  { value: "AUTOMATICO", label: "Automático" },
  { value: "EDAD", label: "Edad por año" },
  { value: "RANGO", label: "Rango de edad" },
  { value: "SITUACION", label: "Situación de edad" },
]
const TIPOS = [
  { value: "PRINCIPAL", label: "Principal" },
  { value: "COMPLEMENTARIA", label: "Complementaria" },
]

const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0)
const celda = (n: number, t: number) => (n ? `${n} · ${pct(n, t)} %` : "—")
const decimal = (v: number | null) => (v == null ? "—" : String(Number(v).toFixed(1)).replace(".", ","))
const centro = "px-3 py-2 text-center tabular-nums"
const unicos = (vs: string[]) => [...new Set(vs.filter(Boolean))].map((v) => ({ value: v, label: v }))

function useConteos(search: InformesSearch) {
  const body = filtrosEdades(search)
  const { GRUPO: _grupo, ...sinGrupo } = body
  return useQuery({
    queryKey: [...informesKeys.all, "edades", sinGrupo] as const,
    queryFn: async () =>
      camelizar<ConteoEdad[]>(await evalCol.postRows("/informes-reportes/edades/query", sinGrupo)).map((c) => ({
        ...c,
        cantidad: Number(c.cantidad),
        edadPromedio: c.edadPromedio == null ? null : Number(c.edadPromedio),
        mediana: c.mediana == null ? null : Number(c.mediana),
      })),
    placeholderData: keepPreviousData,
  })
}

export function EstadisticaEdades({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const { data: periodos = [] } = usePeriodosInformeQuery()
  const [incluir, setIncluir] = useState(false)
  const [genero, setGenero] = useState(false)
  const [desglosar, setDesglosar] = useState(false)
  const [niveles, setNiveles] = useState(1)
  const [abiertos, setAbiertos] = useState<Set<string> | null>(null)
  const [pagina, setPagina] = useState({ pageIndex: 0, pageSize: 10 })

  const agrupar = search.agrupar ?? "GRADO"
  const modo = search.columnas ?? "AUTOMATICO"
  // Agrupar por Establecimiento: roles territoriales, o quien ve varios (Regla 79).
  const { data: contexto } = useContextoTerritorialQuery()
  const variosEstablecimientos = Boolean(contexto) || new Set(periodos.map((p) => p.establecimiento)).size > 1
  const { data: conteos = [], isPending, isError, error } = useConteos(search)

  const raiz = armarArbol(conteos)
  const rango = raiz ? rangoEdades(raiz, conteos) : null
  const cols = columnasEdades(modo, rango)
  const de = indexar(conteos)
  const maxNiveles = raiz ? nivelesMaximos(raiz) : 0
  const abiertosActuales = abiertos ?? (raiz ? abiertosHasta(raiz, niveles) : new Set<string>())
  const filas = raiz ? filasVisibles(raiz, abiertosActuales, desglosar) : []
  const generos = conteos.filter((c) => c.medida === "G" && c.nivel === 0).map((c) => c.clave ?? "Sin género")
  const sinDetalle = agrupar === "GRUPO"

  const set = (k: keyof InformesSearch, v: string) => {
    setAbiertos(null)
    navigate({ search: (prev) => ({ ...prev, [k]: v || undefined, grupoEdad: undefined, page: 0 }), replace: true, resetScroll: false })
  }
  const alternar = (n: NodoEdad) =>
    setAbiertos((prev) => {
      const s = new Set(prev ?? abiertosActuales)
      if (s.has(n.id)) s.delete(n.id)
      else s.add(n.id)
      return s
    })

  const generoDe = (n: NodoEdad) => new Map(de("G", n).map((c) => [c.clave ?? "Sin género", c]))
  const situacionDe = (n: NodoEdad) => new Map(de("S", n).map((c) => [c.clave ?? "SIN_CALCULAR", c.cantidad]))
  const total = raiz?.total.cantidad ?? 0

  const etiquetaFila = (n: NodoEdad) => (
    <span className="flex items-center gap-1" style={{ paddingLeft: `${(n.nivel - 1) * 1.25}rem` }}>
      {desglosar && n.hijos.length ? (
        <button type="button" aria-label={abiertosActuales.has(n.id) ? "Cerrar detalle" : "Abrir detalle"} onClick={() => alternar(n)} className="text-muted-foreground hover:text-foreground">
          {abiertosActuales.has(n.id) ? <CaretDownIcon className="size-4" /> : <CaretRightIcon className="size-4" />}
        </button>
      ) : (
        <span className="inline-block w-4" />
      )}
      {n.label}
    </span>
  )

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <div className="flex flex-wrap items-end gap-3 px-(--screen-spacing) pb-4">
          <div className="w-56">
            <ComboOpciones
              id="eda-agrupar"
              label="Agrupar por"
              size="sm"
              todos={false}
              value={agrupar}
              options={AGRUPAR.filter((a) => a.value !== "ESTABLECIMIENTO" || variosEstablecimientos)}
              onChange={(v) => set("agrupar", v)}
            />
          </div>
          <div className="w-48">
            <ComboOpciones id="eda-columnas" label="Columnas" size="sm" todos={false} value={modo} options={COLUMNAS} onChange={(v) => set("columnas", v)} />
          </div>
          <MarcoOpciones id="eda-opciones" label="Opciones" className="w-auto">
            <div className="flex flex-wrap items-center gap-4">
              <Interruptor
                label="Desglosar"
                checked={desglosar}
                onChange={(v) => {
                  setDesglosar(v)
                  setAbiertos(null)
                }}
                motivo={sinDetalle ? "Grupo es el último nivel: no tiene detalle." : incluir ? "Con Incluir estudiantes no se puede desglosar." : null}
              />
              {desglosar ? (
                <Field variant="outlined" className="w-36 gap-1.5">
                  <FieldLabel htmlFor="eda-niveles">Niveles de detalle</FieldLabel>
                  <Input
                    id="eda-niveles"
                    variant="outlined"
                    inputMode="numeric"
                    value={String(niveles)}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/\D/g, "")) || 1
                      setNiveles(Math.min(Math.max(n, 1), Math.max(maxNiveles, 1)))
                      setAbiertos(null)
                    }}
                  />
                </Field>
              ) : null}
              <Interruptor label="Resumen por género" checked={genero} onChange={setGenero} motivo={null} />
              <Interruptor
                label="Incluir estudiantes"
                checked={incluir}
                onChange={setIncluir}
                motivo={desglosar ? "Con Desglosar no se pueden incluir estudiantes: no se desglosan estudiantes." : null}
              />
            </div>
          </MarcoOpciones>
        </div>
      </TableScreenHeader>
      <TableScreenBody>
        {isPending ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <SpinnerIcon className="animate-spin" /> Cargando…
          </div>
        ) : isError ? (
          <p className="p-10 text-center text-sm text-red">{getErrorMessage(error)}</p>
        ) : !raiz || !total ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No hay estudiantes matriculados con los filtros elegidos.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <Tabla
              cabecera={[
                AGRUPAR.find((a) => a.value === agrupar)?.label ?? "Grado",
                ...cols.map((c) => c.label),
                ...(genero ? generos : []),
                <TituloConAyuda
                  key="total"
                  titulo="Total"
                  ayuda="Cuenta estudiantes únicos: quien tiene dos matrículas en los filtros cuenta en cada fila donde aparece y una sola vez en el total, por eso los subtotales pueden superarlo."
                />,
              ]}
              filas={[...filas, raiz].map((n) => {
                const c = celdasNodo(n, modo, cols, rango, de)
                const t = n.total.cantidad
                const g = generoDe(n)
                return {
                  id: n.id || "total",
                  total: n === raiz,
                  celdas: [
                    n === raiz ? "Total" : etiquetaFila(n),
                    ...cols.map((col) => celda(c[col.key] ?? 0, t)),
                    ...(genero
                      ? generos.map((x) => {
                          const v = g.get(x)
                          return v ? `${v.cantidad} · ${decimal(v.edadPromedio)} años` : "—"
                        })
                      : []),
                    String(t),
                  ],
                }
              })}
            />
            <Tabla
              cabecera={[
                AGRUPAR.find((a) => a.value === agrupar)?.label ?? "Grado",
                <Tooltip key="recomendada">
                  <TooltipTrigger render={<span className="cursor-help underline decoration-dotted underline-offset-4" />}>
                    Edad recomendada
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    Edad recomendada del grado (Parámetros de edad); solo si la fila es de un único grado
                  </TooltipContent>
                </Tooltip>,
                "Mínima",
                "Máxima",
                "Promedio",
                "Mediana",
                ...SITUACIONES.map((s) => AGE_SITUATION_LABELS[s]),
              ]}
              filas={[...filas, raiz].map((n) => {
                const s = situacionDe(n)
                const t = n.total.cantidad
                return {
                  id: n.id || "total",
                  total: n === raiz,
                  celdas: [
                    n === raiz ? "Total" : etiquetaFila(n),
                    n.total.edadRecomendada != null ? `${n.total.edadRecomendada} años` : "—",
                    n.total.edadMin != null ? String(n.total.edadMin) : "—",
                    n.total.edadMax != null ? String(n.total.edadMax) : "—",
                    decimal(n.total.edadPromedio),
                    decimal(n.total.mediana),
                    ...SITUACIONES.map((x) => celda(s.get(x) ?? 0, t)),
                  ],
                }
              })}
            />
            {incluir ? (
              <Estudiantes
                raiz={raiz}
                cols={cols}
                enCol={(n) => celdasNodo(n, modo, cols, rango, de)}
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

function Interruptor({ label, checked, onChange, motivo }: { label: string; checked: boolean; onChange: (v: boolean) => void; motivo: string | null }) {
  const control = (
    <label className={cn("flex items-center gap-2 text-sm", motivo && "opacity-50")}>
      <Switch checked={checked && !motivo} disabled={Boolean(motivo)} onCheckedChange={onChange} /> {label}
    </label>
  )
  if (!motivo) return control
  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>{control}</TooltipTrigger>
      <TooltipContent>{motivo}</TooltipContent>
    </Tooltip>
  )
}

function Tabla({ cabecera, filas }: { cabecera: ReactNode[]; filas: { id: string; total: boolean; celdas: ReactNode[] }[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            {cabecera.map((c, i) => (
              <th
                key={i}
                className={i === 0 ? "sticky left-0 z-10 bg-muted px-3 py-2 text-left font-medium whitespace-nowrap" : `${centro} font-medium whitespace-nowrap`}
              >
                {i === cabecera.length - 1 ? <span className="flex justify-center">{c}</span> : c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className={f.total ? "border-t border-border bg-muted/30 font-semibold" : "border-t border-border"}>
              {f.celdas.map((v, j) => (
                // La primera columna queda fija al desplazar la tabla a lo ancho.
                <td
                  key={j}
                  className={
                    j === 0 ? cn("sticky left-0 z-10 px-3 py-2 whitespace-nowrap", f.total ? "bg-muted" : "bg-background") : cn(centro, "whitespace-nowrap")
                  }
                >
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
  grado: string
  grupo: string
  situacion: AgeSituation
  falta: string | null
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
    // Sin fecha de nacimiento o sin fecha de corte: edad vacía y Sin calcular con el motivo, para corregirlo en la matrícula.
    if (key === "edad") return e.edad ?? ""
    if (key === "grupo") return `${e.grado} · ${e.grupo}`
    if (key === "situacion") {
      const badge = (
        <Badge variant="soft" color="muted" className="rounded-full text-xs font-medium tracking-normal">
          {AGE_SITUATION_LABELS[e.situacion ?? "SIN_CALCULAR"]}
        </Badge>
      )
      if (e.edad != null && e.situacion && e.situacion !== "SIN_CALCULAR") return badge
      return (
        <Tooltip>
          <TooltipTrigger render={<span className="cursor-help" />}>{badge}</TooltipTrigger>
          <TooltipContent className="max-w-64">{e.falta ?? "Falta un dato para calcular la edad"}</TooltipContent>
        </Tooltip>
      )
    }
    return e[key as keyof Estudiante] ?? "—"
  },
  enableSorting: false,
}))

/** Incluir estudiantes (C.4.EDA.2): gráfico de barras del Total o de un grupo de la agrupación, y la lista. */
function Estudiantes({
  raiz,
  cols,
  enCol,
  pagina,
  setPagina,
}: {
  raiz: NodoEdad
  cols: { key: string; label: string }[]
  enCol: (n: NodoEdad) => Record<string, number>
  pagina: { pageIndex: number; pageSize: number }
  setPagina: (p: { pageIndex: number; pageSize: number }) => void
}) {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const grupo = search.grupoEdad ?? ""
  const nodo = raiz.hijos.find((n) => n.label === grupo) ?? raiz
  const body = { ...filtrosEdades(search), GRUPO: grupo || null, PAGEINDEX: pagina.pageIndex, PAGESIZE: pagina.pageSize }
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: [...informesKeys.all, "edades-estudiantes", body] as const,
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>("/informes-reportes/edades/estudiantes/query", body)
      return toPaginated(rows, { pageSize: pagina.pageSize, map: (r) => camelizar<Estudiante>(r) })
    },
    placeholderData: keepPreviousData,
  })
  const { table } = useDataTable({
    columnVisibilityStorageKey: "table-informes-edades-estudiantes",
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
  const valores = enCol(nodo)
  const max = Math.max(...cols.map((c) => valores[c.key] ?? 0), 1)
  const total = nodo.total.cantidad

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <span className="text-sm font-semibold">Distribución de edades</span>
        <div className="w-56">
          <ComboOpciones
            id="eda-grafico"
            label="Gráfico de"
            size="sm"
            todos="Total"
            value={grupo}
            options={raiz.hijos.map((n) => ({ value: n.label, label: n.label }))}
            onChange={(v) => {
              setPagina({ ...pagina, pageIndex: 0 })
              // Sin resetScroll el router sube al inicio de la página en cada cambio de la URL.
              navigate({ search: (prev) => ({ ...prev, grupoEdad: v || undefined }), replace: true, resetScroll: false })
            }}
          />
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium">{grupo || "Total"}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {total === 1 ? "1 estudiante" : `${total.toLocaleString("es-CO")} estudiantes`}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {cols.map((c) => {
            const v = valores[c.key] ?? 0
            return (
              <div key={c.key} className="grid grid-cols-[minmax(6rem,9rem)_1fr_5.5rem] items-center gap-3 text-sm">
                <span className={cn("truncate", v === 0 && "text-muted-foreground")}>{c.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${(v / max) * 100}%` }}
                  />
                </div>
                <span className={cn("text-right tabular-nums", v === 0 && "text-muted-foreground")}>
                  <span className="font-medium">{v}</span>
                  <span className="ml-1.5 inline-block w-10 text-xs text-muted-foreground">
                    {total ? `${Math.round((v / total) * 100)} %` : ""}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
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
          viewOptions={<DataTableViewOptions table={table} />}
        />
      ) : null}
    </div>
  )
}

/**
 * Filtros de la estadística (Sección 3.9), en cascada: Sede (varias), Año, Jornada (varias) y
 * Período (varios; Abiertos y Cerrados) solo de lo elegido; Grado, Estado (por defecto Cursando),
 * Tipo de matrícula y Metodología.
 */
export function FiltrosEdades() {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const { data: periodos = [] } = usePeriodosInformeQuery()
  const { data: grados = [] } = useGradosCatalogQuery()
  const { data: estados = [] } = useMatriculaStatusOptionsQuery()
  const { data: metodologias = [] } = useMetodologiasQuery()

  // Establecimiento solo para roles territoriales; sus períodos ya vienen limitados a su alcance (Regla 79).
  const { data: contexto } = useContextoTerritorialQuery()
  const territorial = Boolean(contexto)
  const ees = search.eEstablecimientos ?? []
  const sedes = search.eSedes ?? []
  const jornadas = search.eJornadas ?? []
  const enEe = periodos.filter((p) => !ees.length || ees.includes(p.establecimiento))
  const enSede = enEe.filter((p) => !sedes.length || sedes.includes(p.sede))
  const enAnio = enSede.filter((p) => !search.anio || p.anio === search.anio)
  const enJornada = enAnio.filter((p) => !jornadas.length || jornadas.includes(p.jornada))

  // El back filtra por períodos: con establecimientos elegidos y ningún período, van los de esos
  // establecimientos (con sede, año y jornada); [-1] si no hay ninguno, para no caer en «todos».
  const set = (cambios: Partial<InformesSearch>) =>
    navigate({
      search: (prev) => {
        const next = { ...prev, ...cambios, grupoEdad: undefined, page: 0 }
        const e = next.eEstablecimientos ?? []
        if (e.length && !next.ePeriodos?.length) {
          const ids = periodos
            .filter(
              (p) =>
                e.includes(p.establecimiento) &&
                (!next.eSedes?.length || next.eSedes.includes(p.sede)) &&
                (!next.eJornadas?.length || next.eJornadas.includes(p.jornada)) &&
                (!next.anio || p.anio === next.anio),
            )
            .map((p) => p.id)
          next.ePeriodos = ids.length ? ids : [-1]
        }
        return next
      },
      replace: true,
    })
  const multi = (id: string, label: string, value: string[], opciones: { value: string; label: string }[], onChange: (v: string[]) => void) => (
    <Field variant="outlined" className="gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <SelectOpciones id={id} size="sm" multiple placeholder="Todos" value={value} opciones={opciones} onValueChange={onChange} />
    </Field>
  )
  const vacioANull = <T,>(v: T[]) => (v.length ? v : undefined)

  return (
    <>
      {territorial
        ? multi("eda-establecimientos", "Establecimiento", ees, unicos(periodos.map((p) => p.establecimiento)), (v) =>
            set({ eEstablecimientos: vacioANull(v), eSedes: undefined, eJornadas: undefined, ePeriodos: undefined }),
          )
        : null}
      {multi("eda-sedes", "Sede", sedes, unicos(enEe.map((p) => p.sede)), (v) =>
        set({ eSedes: vacioANull(v), eJornadas: undefined, ePeriodos: undefined }),
      )}
      <ComboOpciones
        id="eda-anio"
        label="Año"
        size="sm"
        todos="Todos"
        value={search.anio ? String(search.anio) : ""}
        options={[...new Set(enSede.map((p) => p.anio).filter((a): a is number => a != null))]
          .sort((a, b) => b - a)
          .map((a) => ({ value: String(a), label: String(a) }))}
        // El año acota por sus períodos: quedan elegidos todos los del año en las sedes y jornadas elegidas.
        onChange={(v) => {
          const anio = v ? Number(v) : undefined
          const ids = periodos
            .filter((p) => p.anio === anio && (!ees.length || ees.includes(p.establecimiento)) && (!sedes.length || sedes.includes(p.sede)) && (!jornadas.length || jornadas.includes(p.jornada)))
            .map((p) => p.id)
          set({ anio, ePeriodos: anio ? ids : undefined })
        }}
      />
      {multi("eda-jornadas", "Jornada", jornadas, unicos(enAnio.map((p) => p.jornada)), (v) => set({ eJornadas: vacioANull(v), ePeriodos: undefined }))}
      {multi(
        "eda-periodos",
        "Período",
        (search.ePeriodos ?? []).map(String),
        enJornada.map((p) => ({
          value: String(p.id),
          label: `${[p.sede, p.jornada, p.nombre].filter(Boolean).join(" · ")} (${p.estado === "CERRADO" ? "Cerrado" : "Abierto"})`,
        })),
        (v) => set({ ePeriodos: vacioANull(v.map(Number)) }),
      )}
      {multi(
        "eda-grados",
        "Grado",
        (search.eGrados ?? []).map(String),
        grados.map((g) => ({ value: String(g.valor), label: g.nombre })),
        (v) => set({ eGrados: vacioANull(v.map(Number)) }),
      )}
      {multi(
        "eda-estados",
        "Estado de la matrícula",
        search.eEstados ?? ESTADOS_EDADES_DEFECTO,
        estados.filter((e) => e.value !== "Anulado").map((e) => ({ value: e.value, label: e.label })),
        (v) => set({ eEstados: v }),
      )}
      {multi("eda-tipos", "Tipo de matrícula", search.eTipos ?? [], TIPOS, (v) => set({ eTipos: vacioANull(v) }))}
      {multi(
        "eda-metodologias",
        "Metodología",
        search.eMetodologias ?? [],
        metodologias.map((m) => ({ value: m.label, label: m.label })),
        (v) => set({ eMetodologias: vacioANull(v) }),
      )}
    </>
  )
}
