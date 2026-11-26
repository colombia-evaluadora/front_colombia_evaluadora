"use no memo"

import { useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { ArrowUUpLeftIcon, CheckCircleIcon, EyeIcon, PencilIcon, SpinnerIcon, UsersIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInformesReportesRoute } from "@/router"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { useContextoTerritorialQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import {
  CONTROLES,
  DONDE_CORREGIR,
  ESTADOS_HALLAZGO,
  useCambiarEstadoHallazgo,
  useGenerarCalidad,
  useHallazgosQuery,
  useHistorialHallazgoQuery,
  type Hallazgo,
} from "@/features/coverage/informes-reportes/api/calidad"

type Accion = "JUSTIFICAR" | "MODIFICAR" | "DEVOLVER"
const COLOR = { PENDIENTE: "warning", AJUSTADO: "success", JUSTIFICADO: "info" } as const
const etiqueta = (e: string) => ESTADOS_HALLAZGO.find((x) => x.value === e)?.label ?? e

function Icono({ label, disabled, motivo, children, ...rest }: { label: string; disabled?: boolean; motivo?: string; children: ReactNode } & ({ to: string } | { onClick: () => void })) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          "to" in rest && !disabled ? (
            <Button render={<Link to={rest.to} />} nativeButton={false} variant="ghost" color="neutral" size="icon-sm" aria-label={label} />
          ) : (
            <Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={label} disabled={disabled} onClick={"onClick" in rest ? rest.onClick : undefined} />
          )
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{disabled && motivo ? `${label}: ${motivo}` : label}</TooltipContent>
    </Tooltip>
  )
}

/** Rol de quien mira: el establecimiento justifica; la entidad territorial devuelve (Sección 3.9). */
type RolCalidad = "ESTABLECIMIENTO" | "SUPERVISOR" | "ADMINISTRADOR"

function columnas(rol: RolCalidad, onVer: (h: Hallazgo) => void, onAccion: (h: Hallazgo, a: Accion) => void): ColumnDef<Hallazgo>[] {
  const territorial = rol !== "ESTABLECIMIENTO"
  const c = (key: keyof Hallazgo, label: string, cell?: (h: Hallazgo) => ReactNode): ColumnDef<Hallazgo> => ({
    id: key,
    accessorFn: (h) => h[key],
    meta: { label },
    header: ({ column }) => <DataTableColumnHeader column={column} title={label} />,
    cell: ({ row }) => (cell ? cell(row.original) : ((row.original[key] as ReactNode) ?? "—")),
    enableSorting: false,
  })
  return [
    c("control", "Control", (h) => CONTROLES[h.control] ?? h.control),
    c("estudiante", "Estudiante", (h) => <span className="font-medium">{h.estudiante}</span>),
    c("establecimiento", "Establecimiento"),
    c("dato", "Dato que falla"),
    c("estado", "Estado", (h) => (
      <Badge variant="soft" color={COLOR[h.estado]} className="text-xs">
        {etiqueta(h.estado)}
      </Badge>
    )),
    {
      id: "actions",
      size: 48 * 5,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const h = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Icono label="Ver detalle" onClick={() => onVer(h)}>
              <EyeIcon />
            </Icono>
            {h.control === "C1" ? (
              <Icono
                label="Unificar estudiantes"
                to={paths.app.coberturaMatriculaDetalle.getHref(String(h.matriculaId))}
                disabled={h.estado === "AJUSTADO" || rol === "SUPERVISOR"}
                motivo={h.estado === "AJUSTADO" ? "el hallazgo ya está ajustado" : "el Supervisor territorial solo consulta"}
              >
                <UsersIcon />
              </Icono>
            ) : null}
            <Icono
              label="Justificar"
              onClick={() => onAccion(h, "JUSTIFICAR")}
              disabled={h.estado !== "PENDIENTE" || territorial}
              motivo={h.estado !== "PENDIENTE" ? "solo con el hallazgo Pendiente" : "justifica el establecimiento"}
            >
              <CheckCircleIcon />
            </Icono>
            <Icono
              label="Modificar justificación"
              onClick={() => onAccion(h, "MODIFICAR")}
              disabled={h.estado !== "JUSTIFICADO" || territorial}
              motivo={h.estado !== "JUSTIFICADO" ? "solo con el hallazgo Justificado" : "solo quien justificó"}
            >
              <PencilIcon />
            </Icono>
            <Icono
              label="Devolver a pendiente"
              onClick={() => onAccion(h, "DEVOLVER")}
              disabled={h.estado !== "JUSTIFICADO" || !territorial}
              motivo={h.estado !== "JUSTIFICADO" ? "solo con el hallazgo Justificado" : "solo los roles territoriales"}
            >
              <ArrowUUpLeftIcon />
            </Icono>
          </div>
        )
      },
      enableHiding: false,
      enableSorting: false,
    },
  ]
}

/**
 * Calidad de la información de matrícula (C.4.CAL.1; Regla 77): una fila por
 * estudiante y control con el dato que falla y su estado de gestión. No bloquea nada.
 */
export function CalidadInforme({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useHallazgosQuery(search, { pageIndex, pageSize })
  const [ver, setVer] = useState<Hallazgo | null>(null)
  const [accion, setAccion] = useState<{ h: Hallazgo; a: Accion } | null>(null)
  const { data: territorial } = useContextoTerritorialQuery()
  const rol: RolCalidad = !territorial ? "ESTABLECIMIENTO" : /supervisor/i.test(territorial.rol) ? "SUPERVISOR" : "ADMINISTRADOR"
  const { table } = useDataTable({
    columns: columnas(rol, setVer, (h, a) => setAccion({ h, a })),
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (h) => String(h.hallazgoId),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-informes-calidad",
  })
  const resumen = Object.entries(data?.porControl ?? {})
    .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
    .map(([k, n]) => `${k} ${n}`)
    .join(" · ")

  return (
    <TableScreen>
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        {data ? (
          <p className="mb-3 text-sm">
            <span className="font-semibold">Hallazgos por control:</span> {resumen || "ninguno"}
            {data.rows[0]?.corte ? <span className="text-muted-foreground"> · Corte del {data.rows[0].corte.slice(0, 10).split("-").reverse().join("/")}</span> : null}
          </p>
        ) : null}
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage="No hay hallazgos. Elija el período y use Generar para revisar la calidad de la matrícula."
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
      {ver ? <DialogDetalle h={ver} onClose={() => setVer(null)} /> : null}
      {accion ? <DialogEstado h={accion.h} accion={accion.a} onClose={() => setAccion(null)} /> : null}
    </TableScreen>
  )
}

/** Filtros propios de Calidad: Control, Estado y búsqueda por estudiante. */
export function FiltrosCalidad() {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const set = (k: string, v: string) => navigate({ search: (prev) => ({ ...prev, [k]: v || undefined, page: 0 }), replace: true })
  return (
    <>
      <ComboOpciones id="cal-control" label="Control" size="sm" value={search.control ?? ""} options={Object.entries(CONTROLES).map(([value, label]) => ({ value, label }))} onChange={(v) => set("control", v)} />
      <ComboOpciones id="cal-estado" label="Estado" size="sm" value={search.estadoHallazgo ?? ""} options={ESTADOS_HALLAZGO} onChange={(v) => set("estadoHallazgo", v)} />
      <Field variant="outlined" className="gap-1.5">
        <FieldLabel htmlFor="cal-buscar">Buscar estudiante</FieldLabel>
        <Input id="cal-buscar" variant="outlined" value={search.q ?? ""} onChange={(e) => set("q", e.target.value)} />
      </Field>
    </>
  )
}

/** Generar (C.4.CAL.1): una generación nueva del período elegido a la fecha de corte. */
export function GenerarCalidad() {
  const search = coberturaInformesReportesRoute.useSearch()
  const { notify } = useNotify()
  const generar = useGenerarCalidad()
  const [abierto, setAbierto] = useState(false)
  const [corte, setCorte] = useState(new Date().toISOString().slice(0, 10))
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={<Button type="button" variant="fill" color="primary" size="sm" disabled={!search.periodo} onClick={() => setAbierto(true)} />}
        >
          Generar
        </TooltipTrigger>
        <TooltipContent>{search.periodo ? "Revisar la calidad de la matrícula del período" : "Elija el período académico primero"}</TooltipContent>
      </Tooltip>
      {abierto ? (
        <Dialog open onOpenChange={(o) => !o && !generar.isPending && setAbierto(false)}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Generar calidad de la información</DialogTitle>
            </DialogHeader>
            <Field variant="outlined" className="gap-1.5">
              <FieldLabel htmlFor="cal-corte">
                Fecha de corte<span data-required-mark="">*</span>
              </FieldLabel>
              <Input id="cal-corte" type="date" variant="outlined" value={corte} onChange={(e) => setCorte(e.target.value)} />
              <FieldDescription>La edad atípica se calcula a esta fecha. Una generación nueva hereda el estado de lo que sigue fallando igual.</FieldDescription>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" color="neutral" onClick={() => setAbierto(false)} disabled={generar.isPending}>
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button
                type="button"
                variant="fill"
                color="primary"
                disabled={!corte || generar.isPending}
                onClick={() =>
                  generar.mutate(
                    { periodo: search.periodo as number, corte },
                    {
                      onSuccess: () => {
                        notify("Se generó la calidad de la información.", { variant: "success" })
                        setAbierto(false)
                      },
                      onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
                    },
                  )
                }
              >
                {generar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : null}
                Generar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}

/** Ver detalle (C.4.CAL.4): control, estudiante, dato, estado, justificación e historial. */
function DialogDetalle({ h, onClose }: { h: Hallazgo; onClose: () => void }) {
  const { data: historial = [], isPending } = useHistorialHallazgoQuery(h.hallazgoId)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Calidad › {h.control} · {h.estudiante}
          </DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Control</dt>
          <dd>{CONTROLES[h.control] ?? h.control}</dd>
          <dt className="text-muted-foreground">Dato que falla</dt>
          <dd>{h.dato}</dd>
          {DONDE_CORREGIR[h.control] ? (
            <>
              <dt className="text-muted-foreground">Dónde se corrige</dt>
              <dd>{DONDE_CORREGIR[h.control]}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">Estado</dt>
          <dd>{etiqueta(h.estado)}</dd>
          {h.justificacion ? (
            <>
              <dt className="text-muted-foreground">Justificación</dt>
              <dd>{h.justificacion}</dd>
            </>
          ) : null}
        </dl>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Historial de estados</p>
          {isPending ? (
            <SpinnerIcon className="animate-spin" />
          ) : (
            historial.map((e, i) => (
              <div key={i} className="text-sm">
                <p className="text-muted-foreground">
                  {e.fecha.slice(0, 10).split("-").reverse().join("/")} · {e.actor}
                </p>
                <p>{e.texto}</p>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="fill" color="primary" onClick={onClose}>
            Volver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const TITULOS: Record<Accion, { titulo: string; campo: string; boton: string }> = {
  JUSTIFICAR: { titulo: "Justificar el hallazgo", campo: "Justificación", boton: "Justificar" },
  MODIFICAR: { titulo: "Modificar la justificación", campo: "Justificación", boton: "Guardar" },
  DEVOLVER: { titulo: "Devolver a pendiente", campo: "Observación", boton: "Devolver" },
}

/** Justificar (C.4.CAL.2), Modificar (C.4.CAL.2a) o Devolver a pendiente (C.4.CAL.3): texto de 10 a 500. */
function DialogEstado({ h, accion, onClose }: { h: Hallazgo; accion: Accion; onClose: () => void }) {
  const { notify } = useNotify()
  const cambiar = useCambiarEstadoHallazgo()
  const [texto, setTexto] = useState(accion === "MODIFICAR" ? (h.justificacion ?? "") : "")
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const t = TITULOS[accion]
  const valido = texto.trim().length >= 10 && texto.length <= 500
  return (
    <Dialog open onOpenChange={(o) => !o && !cambiar.isPending && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t.titulo}</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          {CONTROLES[h.control] ?? h.control} · <b>{h.estudiante}</b>: {h.dato}
        </p>
        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="cal-texto">
            {t.campo}
            <span data-required-mark="">*</span>
          </FieldLabel>
          <Textarea id="cal-texto" rows={4} maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <FieldDescription>{texto.length} / 500 · Mínimo 10 caracteres. No cambia el dato: para ajustarlo use la acción de su bloque.</FieldDescription>
        </Field>
        {errorEnvio ? <p className="text-sm text-red">{errorEnvio}</p> : null}
        <DialogFooter className="items-center">
          <span className="mr-auto text-xs text-muted-foreground">Los campos marcados con * son obligatorios</span>
          <Button type="button" variant="outline" color="neutral" onClick={onClose} disabled={cambiar.isPending}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            disabled={!valido || cambiar.isPending}
            onClick={() =>
              cambiar.mutate(
                { id: h.hallazgoId, accion, texto: texto.trim() },
                {
                  onSuccess: () => {
                    notify(accion === "DEVOLVER" ? "El hallazgo volvió a Pendiente." : "Se guardó la justificación.", { variant: "success" })
                    onClose()
                  },
                  onError: (e) => setErrorEnvio(getErrorMessage(e)),
                },
              )
            }
          >
            {t.boton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
