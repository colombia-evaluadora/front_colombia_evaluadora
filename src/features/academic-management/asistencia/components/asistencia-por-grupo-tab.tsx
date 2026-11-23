import { Link } from "@tanstack/react-router"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GearIcon, InfoIcon, MagnifyingGlassIcon } from "@/components/ui/icons"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { toSelectItemsMap } from "@/lib/catalog-options"
import { cn } from "@/lib/utils"

import { useAsistenciaCalendarioQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import {
  totalesEstudiante,
  useAsistenciaPorGrupoQuery,
  usePeriodosGrupoQuery,
  useRotuloAsignaturaGrupo,
  type CeldaAsistencia,
  type EstudianteGrupo,
  type SesionGrupo,
  type TotalesEstudiante,
} from "@/features/academic-management/asistencia/api/query/use-asistencia-por-grupo-query"
import {
  useAsistenciaDiariaGruposQuery,
  useAsistenciaDiariaPorGrupoQuery,
} from "@/features/academic-management/asistencia/api/query/use-asistencia-diaria-query"
import { etiquetaGrupo, totalesPorDia } from "@/features/academic-management/asistencia/utils/asistencia-diaria"
import {
  armarReportePorGrupo,
  type ReportePorGrupo,
  type TotalPorGrupo,
} from "@/features/academic-management/asistencia/utils/reporte-por-grupo"

export const TODAS_ASIGNATURAS = "todas"

export interface FiltrosPorGrupo {
  grupo?: number
  asignatura?: number | typeof TODAS_ASIGNATURAS
  periodo?: number
}

export type { ReportePorGrupo }

type Total = TotalPorGrupo
const TOTALES: { id: Total; corto: string; largo: string; ayuda: string }[] = [
  { id: "fallas", corto: "Fallas", largo: "Fallas", ayuda: "Sesiones con No asistió" },
  {
    id: "justificadas",
    corto: "Justif.",
    largo: "Justificadas",
    ayuda: "Fallas o retrasos con excusa",
  },
  { id: "retrasos", corto: "Retra.", largo: "Retrasos", ayuda: "Sesiones con Llegó tarde" },
  {
    id: "porcentaje",
    corto: "% asist.",
    largo: "% asistencia",
    ayuda: "Asistió o Llegó tarde sobre las sesiones registradas",
  },
]

const porcentaje = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 })
const fechaCorta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const textoTotal = (t: TotalesEstudiante, id: Total) =>
  id === "porcentaje"
    ? t.porcentaje == null
      ? "—"
      : `${porcentaje.format(t.porcentaje)} %`
    : String(t[id])

/** Letra de la planilla de papel: A, N, N·J, T, T·J; — si no estaba en el grupo. */
function letra(celda: CeldaAsistencia | undefined): string {
  if (!celda || !celda.enGrupo) return "—"
  if (celda.marca == null) return ""
  const base = celda.marca === "ASISTIO" ? "A" : celda.marca === "FALLA" ? "N" : "T"
  return celda.justificada && base !== "A" ? `${base}·J` : base
}

const NOMBRE_LETRA: Record<string, string> = {
  A: "Asistió",
  N: "No asistió",
  N·J: "No asistió, justificada",
  T: "Llegó tarde",
  T·J: "Llegó tarde, justificada",
  "—": "No estaba en el grupo en esa fecha",
}

const COLOR_LETRA: Record<string, string> = {
  A: "text-green",
  N: "text-red",
  N·J: "text-orange",
  T: "text-yellow",
  T·J: "text-yellow",
  "—": "text-muted-foreground/50",
}

interface AsistenciaPorGrupoTabProps {
  sede: number | null
  filtros: FiltrosPorGrupo
  onFiltros: (cambios: FiltrosPorGrupo) => void
  /** El docente sin dirección de grupo solo ve lo que dicta (Regla 76). */
  soloLasQueDicta: boolean
  /** El docente abre la planilla de una sesión desde su fecha. */
  puedeAbrirPlanilla: boolean
  onReporte: (reporte: ReportePorGrupo | null) => void
}

/** Pestaña "Asistencia por grupo" (Sección 7): un estudiante por fila; con una
 *  asignatura, una sesión por columna, y con todas, una columna por asignatura
 *  con sus fallas · retrasos. Los totales son del período de evaluación. */
export function AsistenciaPorGrupoTab({
  sede,
  filtros,
  onFiltros,
  soloLasQueDicta,
  puedeAbrirPlanilla,
  onReporte,
}: AsistenciaPorGrupoTabProps) {
  const [texto, setTexto] = React.useState("")
  const [pagina, setPagina] = React.useState(0)
  const [porPagina, setPorPagina] = React.useState(10)
  const [ocultos, setOcultos] = React.useState<Set<Total>>(new Set())

  // Grupos y asignaturas: los de las clases del mes en la sede, dentro del alcance.
  const hoy = new Date()
  const { data: clases = [] } = useAsistenciaCalendarioQuery(
    {
      SEDE: sede ?? 0,
      ANIO: hoy.getFullYear(),
      MES: hoy.getMonth() + 1,
      MIAS: soloLasQueDicta || undefined,
    },
    sede != null,
  )
  // Regla 115: el calendario por clase deja fuera los grupos Diaria; salen de /asistencias/diaria/grupos
  // (docente: solo sus asignaturas y sin registrar; Responsable de grupo o nivel <= 2: todas).
  const { data: diarios = [] } = useAsistenciaDiariaGruposQuery(sede)
  const grupos = new Map<number, string>()
  for (const c of clases) grupos.set(c.fk_grupo, `${c.grado}${c.grupo}`)
  for (const d of diarios) if (!grupos.has(d.fk_tgrupo)) grupos.set(d.fk_tgrupo, etiquetaGrupo(d))
  const grupoDiario = diarios.find((d) => d.fk_tgrupo === filtros.grupo)
  const esDiaria = grupoDiario != null
  // En un grupo Diaria quien no registra (el docente) ve solo su asignatura.
  const soloSuAsignatura = soloLasQueDicta || (esDiaria && !grupoDiario.puede_registrar)
  const opcionesGrupo = [...grupos]
    .map(([value, label]) => ({ value: String(value), label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true }))
  const asignaturas = new Map<number, string>()
  for (const c of clases) {
    if (c.fk_grupo === filtros.grupo && !c.es_formativa)
      asignaturas.set(c.fk_asignatura, c.asignatura)
  }
  for (const a of grupoDiario?.asignaturas ?? []) asignaturas.set(a.fk_tasignatura, a.asignatura)
  const rotuloAsignatura = useRotuloAsignaturaGrupo(filtros.grupo)
  const opcionesAsignatura = [
    ...(soloSuAsignatura ? [] : [{ value: TODAS_ASIGNATURAS, label: opcionTodas(rotuloAsignatura) }]),
    ...[...asignaturas]
      .map(([value, label]) => ({ value: String(value), label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es")),
  ]

  const { data: periodos = [] } = usePeriodosGrupoQuery(filtros.grupo)
  const periodo = filtros.periodo ?? periodos.find((p) => p.enCurso)?.id ?? periodos.at(-1)?.id
  const opcionesPeriodo = periodos.map((p) => ({ value: String(p.id), label: p.nombre }))

  // El docente que solo ve lo que dicta arranca en su primera asignatura.
  const asignatura =
    filtros.asignatura != null
      ? String(filtros.asignatura)
      : soloSuAsignatura
        ? opcionesAsignatura[0]?.value
        : undefined
  const todas = asignatura === TODAS_ASIGNATURAS
  const listo = filtros.grupo != null && periodo != null && asignatura != null
  const { data, isPending, isError, error } = useAsistenciaPorGrupoQuery(
    listo
      ? {
          GRUPO: filtros.grupo!,
          PERIODO: periodo!,
          ASIGNATURA: todas ? undefined : Number(asignatura),
        }
      : null,
  )

  const filtro = texto.trim().toLocaleLowerCase("es")
  const estudiantes = (data?.estudiantes ?? []).filter(
    (e) =>
      !filtro || e.nombre.toLocaleLowerCase("es").includes(filtro) || e.documento.includes(filtro),
  )
  const paginas = Math.max(1, Math.ceil(estudiantes.length / porPagina))
  const paginaActual = Math.min(pagina, paginas - 1)
  const visibles = estudiantes.slice(paginaActual * porPagina, (paginaActual + 1) * porPagina)
  const totales = TOTALES.filter((t) => !ocultos.has(t.id))

  const nombreGrupo = opcionesGrupo.find((o) => o.value === String(filtros.grupo))?.label
  const nombreAsignatura = opcionesAsignatura.find((o) => o.value === asignatura)?.label
  const nombrePeriodo = opcionesPeriodo.find((o) => o.value === String(periodo))?.label

  // Grupo Diaria: el docente consulta en solo lectura; con todas las asignaturas, el día cuenta una vez.
  const lecturaDiaria = esDiaria && !grupoDiario.puede_registrar
  const { data: diasDiarios } = useAsistenciaDiariaPorGrupoQuery(
    listo && esDiaria && todas && !lecturaDiaria ? { GRUPO: filtros.grupo!, PERIODO: periodo! } : null,
  )
  const totalesDiarios = diasDiarios ? totalesPorDia(diasDiarios) : undefined

  // Imprimir/Exportar: el servicio de reportes arma la tabla con los mismos filtros, búsqueda y totales visibles.
  const reporte =
    listo && data && data.sesiones.length > 0 && estudiantes.length > 0
      ? armarReportePorGrupo({
          grupo: filtros.grupo!,
          periodo: periodo!,
          asignatura: todas ? undefined : Number(asignatura),
          busqueda: texto,
          ocultos,
          grupoNombre: nombreGrupo ?? "",
          areaNombre: nombreAsignatura ?? "",
          periodoNombre: nombrePeriodo ?? "",
        })
      : null
  const claveReporte = reporte ? JSON.stringify(reporte) : null
  React.useEffect(() => {
    onReporte(claveReporte ? (JSON.parse(claveReporte) as ReportePorGrupo) : null)
  }, [claveReporte, onReporte])

  return (
    <div className="flex flex-col gap-4">
      {lecturaDiaria && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 px-4 py-3 text-sm"
        >
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue" />
          <p className="flex-1">
            <b>{nombreGrupo}</b> registra la asistencia por día (modo Diaria): la registra el Responsable de grupo.
            Usted la consulta en solo lectura, solo con su asignatura ({nombreAsignatura ?? rotuloAsignatura}), sin
            abrir la planilla.
          </p>
          <Badge variant="soft" color="neutral">
            Solo lectura
          </Badge>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Filtro
            etiqueta="Grado/Grupo"
            opciones={opcionesGrupo}
            valor={filtros.grupo != null ? String(filtros.grupo) : ""}
            disabled={sede == null}
            onChange={(v) => {
              setPagina(0)
              onFiltros({
                grupo: Number(v),
                asignatura: soloLasQueDicta ? undefined : TODAS_ASIGNATURAS,
                periodo: undefined,
              })
            }}
          />
          <Filtro
            etiqueta={rotuloAsignatura}
            opciones={opcionesAsignatura}
            valor={asignatura ?? ""}
            disabled={filtros.grupo == null}
            onChange={(v) => {
              setPagina(0)
              onFiltros({ ...filtros, asignatura: v === TODAS_ASIGNATURAS ? v : Number(v) })
            }}
          />
          <Filtro
            etiqueta="Período de evaluación"
            opciones={opcionesPeriodo}
            valor={periodo != null ? String(periodo) : ""}
            disabled={filtros.grupo == null}
            onChange={(v) => {
              setPagina(0)
              onFiltros({ ...filtros, periodo: Number(v) })
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
      </div>

      <div>
        <label className="relative block w-full">
          <span className="sr-only">Buscar estudiante</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setPagina(0)
            }}
            placeholder="Buscar estudiante por nombre o documento"
            variant="outlined"
            aria-label="Buscar estudiante"
            className="pl-9"
          />
        </label>
      </div>

      {!listo ? (
        <Vacio>Elija el grado/grupo y la asignatura para ver la asistencia.</Vacio>
      ) : isError ? (
        <Vacio className="text-red">{getErrorMessage(error)}</Vacio>
      ) : isPending ? (
        <Skeleton className="h-80 w-full" />
      ) : data.sesiones.length === 0 ? (
        <Vacio>
          {nombreGrupo} todavía no tiene clases {todas ? "" : `de ${nombreAsignatura} `}en{" "}
          {nombrePeriodo}.
        </Vacio>
      ) : estudiantes.length === 0 ? (
        <Vacio>Ningún estudiante coincide con «{texto.trim()}».</Vacio>
      ) : (
        <>
          <div>
            {todas ? (
              <MatrizAsignaturas
                sesiones={data.sesiones}
                estudiantes={visibles}
                totales={totales}
                totalesDiarios={totalesDiarios}
              />
            ) : (
              <MatrizSesiones
                sesiones={data.sesiones}
                estudiantes={visibles}
                totales={totales}
                planilla={
                  puedeAbrirPlanilla && sede != null && !lecturaDiaria
                    ? { sede, grupo: filtros.grupo!, periodo, diaria: esDiaria }
                    : null
                }
              />
            )}
          </div>
          <Leyenda todas={todas} />
          <Pagination
            pageIndex={paginaActual}
            pageCount={paginas}
            canPrev={paginaActual > 0}
            canNext={paginaActual < paginas - 1}
            totalCount={estudiantes.length}
            pageSize={porPagina}
            onPageChange={setPagina}
            onPageSizeChange={(size) => {
              setPorPagina(size)
              setPagina(0)
            }}
            // Como en las demás tablas: las columnas visibles van junto a la paginación.
            viewOptions={
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" color="muted" size="icon" aria-label="Columnas visibles" />}
                >
                  <GearIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {TOTALES.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.id}
                        checked={!ocultos.has(c.id)}
                        onCheckedChange={(checked) =>
                          setOcultos((prev) => {
                            const next = new Set(prev)
                            if (checked) next.delete(c.id)
                            else next.add(c.id)
                            return next
                          })
                        }
                      >
                        {c.largo}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        </>
      )}
    </div>
  )
}

function Filtro({
  etiqueta,
  opciones,
  valor,
  disabled,
  onChange,
}: {
  etiqueta: string
  opciones: { value: string; label: string }[]
  valor: string
  disabled?: boolean
  onChange: (valor: string) => void
}) {
  const id = `por-grupo-${etiqueta.toLowerCase().replace(/[^a-z]+/g, "-")}`
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>{etiqueta}*</FieldLabel>
      <Select
        items={toSelectItemsMap(opciones)}
        value={valor}
        disabled={disabled}
        onValueChange={(v) => v && onChange(v)}
      >
        <SelectTrigger id={id} variant="outlined" className="w-full" aria-required>
          <SelectValue placeholder="Seleccione" />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function Vacio({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  )
}

// Encabezado fijo al hacer scroll vertical dentro de la tabla.
const TH = "sticky top-0 z-20 border-b border-border bg-card"
// Sesión sin registrar: rayado tenue, como una casilla de planilla sin llenar.
const SIN_REGISTRAR =
  "bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--color-border)_6px_7px)]"
const TD = "border-b border-border"
const ANCHO_TOTAL = 96
// Los totales quedan fijos a la derecha mientras se recorren las sesiones.
const fijoDerecha = (i: number, n: number) => ({
  right: (n - 1 - i) * ANCHO_TOTAL,
  width: ANCHO_TOTAL,
  minWidth: ANCHO_TOTAL,
})

function EncabezadoTotales({ totales }: { totales: typeof TOTALES }) {
  return totales.map((t, i) => (
    <TableHead
      key={t.id}
      scope="col"
      style={fijoDerecha(i, totales.length)}
      className={cn(TH, "z-30 text-center", i === 0 && "border-l")}
    >
      <Tooltip>
        <TooltipTrigger
          render={<span className="cursor-help underline decoration-dotted underline-offset-4" />}
        >
          {t.corto}
        </TooltipTrigger>
        <TooltipContent>{t.ayuda}</TooltipContent>
      </Tooltip>
    </TableHead>
  ))
}

function CeldasTotales({ t, totales }: { t: TotalesEstudiante; totales: typeof TOTALES }) {
  return totales.map((c, i) => (
    <TableCell
      key={c.id}
      style={fijoDerecha(i, totales.length)}
      className={cn(
        TD,
        "sticky z-10 bg-card text-center tabular-nums group-hover:bg-muted",
        i === 0 && "border-l",
        c.id === "fallas" && t.fallas > 0 && "font-semibold text-red",
      )}
    >
      {textoTotal(t, c.id)}
    </TableCell>
  ))
}

function NombreEstudiante({ estudiante }: { estudiante: EstudianteGrupo }) {
  return (
    <TableHead
      scope="row"
      className={cn(
        TD,
        "sticky left-0 z-10 min-w-52 bg-card text-left font-semibold text-foreground normal-case tracking-normal group-hover:bg-muted",
      )}
    >
      <span className="block truncate" title={estudiante.documento}>
        {estudiante.nombre}
      </span>
    </TableHead>
  )
}

function MatrizSesiones({
  sesiones,
  estudiantes,
  totales,
  planilla,
}: {
  sesiones: SesionGrupo[]
  estudiantes: EstudianteGrupo[]
  totales: typeof TOTALES
  /** `diaria`: el grupo registra por día y la fecha abre la planilla diaria (Regla 115). */
  planilla: { sede: number; grupo: number; periodo?: number; diaria?: boolean } | null
}) {
  // Una columna por día: el back ya junta los bloques (la cascada de Llegó tarde es un Retraso).
  return (
    <Table className="min-w-max border-separate border-spacing-0" containerClassName="max-h-[60vh] overflow-y-auto">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col" className={cn(TH, "left-0 z-30 text-left")}>
            Estudiante
          </TableHead>
          {sesiones.map((s) => {
            const etiqueta = (
              <span className="font-medium text-primary tabular-nums">
                {fechaCorta(s.fecha)}
              </span>
            )
            return (
              <TableHead
                key={s.id}
                scope="col"
                className={cn(TH, "w-[75px] px-2 text-center", !s.registrada && "bg-muted")}
              >
                {planilla ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        planilla.diaria ? (
                          <Link
                            to={paths.app.asistenciaDiaria.getHref()}
                            search={{
                              fecha: s.fecha,
                              sede: planilla.sede,
                              grupo: planilla.grupo,
                              desde: "grupo",
                              periodo: planilla.periodo,
                            }}
                            className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                          />
                        ) : (
                          <Link
                            to={paths.app.asistenciaManual.getHref()}
                            search={{
                              fecha: s.fecha,
                              sede: planilla.sede,
                              grupo: planilla.grupo,
                              asignatura: s.fkAsignatura,
                              desde: "grupo",
                              periodo: planilla.periodo,
                            }}
                            className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                          />
                        )
                      }
                    >
                      {etiqueta}
                    </TooltipTrigger>
                    <TooltipContent>
                      {planilla.diaria
                        ? "Abrir la planilla diaria"
                        : s.registrada
                          ? "Abrir la planilla"
                          : "Registrar esta sesión"}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  etiqueta
                )}
                {!s.registrada && (
                  <Badge variant="outline" color="neutral" className="mt-1 block w-fit mx-auto">
                    Pendiente
                  </Badge>
                )}
              </TableHead>
            )
          })}
          <EncabezadoTotales totales={totales} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {estudiantes.map((e) => (
          <TableRow key={e.fkMatricula} className="group">
            <NombreEstudiante estudiante={e} />
            {sesiones.map((s) => {
              const celda = e.celdas.get(s.id)
              const l = s.registrada ? letra(celda) : ""
              return (
                <TableCell
                  key={s.id}
                  className={cn(
                    TD,
                    "text-center font-semibold group-hover:bg-muted/60",
                    !s.registrada && SIN_REGISTRAR,
                    COLOR_LETRA[l],
                  )}
                  title={
                    // Bloque de llegada: solo con Llegó tarde sin excusa (lo manda el back).
                    l === "T" && celda?.bloqueLlegada != null
                      ? `${NOMBRE_LETRA[l]} · Bloque ${celda.bloqueLlegada + 1}`
                      : NOMBRE_LETRA[l]
                  }
                >
                  {l}
                </TableCell>
              )
            })}
            <CeldasTotales t={totalesEstudiante(e, sesiones)} totales={totales} />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function MatrizAsignaturas({
  sesiones,
  estudiantes,
  totales,
  totalesDiarios,
}: {
  sesiones: SesionGrupo[]
  estudiantes: EstudianteGrupo[]
  totales: typeof TOTALES
  /** Grupo Diaria: totales del estudiante por día (/asistencias/diaria/por-grupo). */
  totalesDiarios?: Map<number, TotalesEstudiante>
}) {
  const asignaturas = agruparPorAsignatura(sesiones)
  return (
    <Table className="min-w-max border-separate border-spacing-0" containerClassName="max-h-[60vh] overflow-y-auto">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col" className={cn(TH, "left-0 z-30 text-left")}>
            Estudiante
          </TableHead>
          {asignaturas.map((a) => (
            <TableHead key={a.id} scope="col" className={cn(TH, "px-4 text-center")}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="cursor-help underline decoration-dotted underline-offset-4" />
                  }
                >
                  {a.nombre}
                </TooltipTrigger>
                <TooltipContent>Fallas · retrasos en {a.nombre}</TooltipContent>
              </Tooltip>
            </TableHead>
          ))}
          <EncabezadoTotales totales={totales} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {estudiantes.map((e) => (
          <TableRow key={e.fkMatricula} className="group">
            <NombreEstudiante estudiante={e} />
            {asignaturas.map((a) => {
              const t = totalesEstudiante(e, a.sesiones)
              return (
                <TableCell
                  key={a.id}
                  className={cn(TD, "text-center tabular-nums group-hover:bg-muted/60")}
                >
                  <span
                    className={cn(
                      t.fallas > 0 ? "font-semibold text-red" : "text-muted-foreground",
                    )}
                  >
                    {t.fallas}
                  </span>
                  <span className="mx-1 text-muted-foreground/60">·</span>
                  <span
                    className={cn(
                      t.retrasos > 0 ? "font-semibold text-yellow" : "text-muted-foreground",
                    )}
                  >
                    {t.retrasos}
                  </span>
                </TableCell>
              )
            })}
            <CeldasTotales
              t={totalesDiarios?.get(e.fkMatricula) ?? totalesEstudiante(e, sesiones)}
              totales={totales}
            />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function agruparPorAsignatura(sesiones: SesionGrupo[]) {
  const map = new Map<number, { id: number; nombre: string; sesiones: SesionGrupo[] }>()
  for (const s of sesiones) {
    const a = map.get(s.fkAsignatura) ?? { id: s.fkAsignatura, nombre: s.asignatura, sesiones: [] }
    a.sesiones.push(s)
    map.set(s.fkAsignatura, a)
  }
  return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
}

function Leyenda({ todas }: { todas: boolean }) {
  if (todas) {
    return (
      <p className="text-xs text-muted-foreground">
        Cada asignatura muestra fallas · retrasos del período.
      </p>
    )
  }
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(["A", "N", "N·J", "T", "—"] as const).map((l) => (
        <li key={l}>
          <b className={COLOR_LETRA[l]}>{l}</b> {NOMBRE_LETRA[l].replace(" en esa fecha", "")}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className={cn("inline-block h-3 w-4 rounded-sm ring-1 ring-border", SIN_REGISTRAR)} />{" "}
        Sesión sin registrar
      </li>
    </ul>
  )
}

/** "Asignatura" → "Todas las asignaturas", "Dimensión" → "Todas las dimensiones"
 *  (solo se pluraliza la primera palabra);
 *  un rótulo en -o se asume masculino ("Campo" → "Todos los campos"). */
function opcionTodas(rotulo: string): string {
  const [r = "", ...resto] = rotulo.trim().toLocaleLowerCase("es").split(" ")
  const plural = /[aeiouáéó]$/.test(r)
    ? `${r}s`
    : /ón$/.test(r)
      ? `${r.slice(0, -2)}ones`
      : `${r}es`
  return [/o$/.test(r) ? "Todos los" : "Todas las", plural, ...resto].join(" ")
}
