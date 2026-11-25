"use no memo"

import { useState, type ReactNode } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
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
import { CalendarDotsIcon, ChatCircleDotsIcon, EyeIcon, FileTextIcon, UsersIcon, XIcon } from "@/components/ui/icons"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { coberturaInformesReportesRoute } from "@/router"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { useOrientar } from "@/features/coverage/inscripcion-reservas/api/mutations/territorial"
import { TEMAS_ORIENTACION } from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"
import { filtrosFuera, SITUACIONES_FUERA, type FueraMatricula } from "@/features/coverage/informes-reportes/api/fuera-matricula"

const COLOR: Record<string, "neutral" | "destructive" | "warning"> = {
  RETIRADO: "neutral",
  SIN_CONTINUIDAD: "destructive",
  SIN_CUPO_PLATAFORMA: "warning",
}
const etiqueta = (s: string) => SITUACIONES_FUERA.find((x) => x.value === s)?.label ?? s
const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—")

function Situacion({ f }: { f: FueraMatricula }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant="soft" color={COLOR[f.situacion] ?? "neutral"} className="text-xs">
        {etiqueta(f.situacion)}
      </Badge>
      {f.liberadaPorRetiro ? (
        <Badge variant="soft" color="warning" className="text-xs">
          Liberada por retiro
        </Badge>
      ) : null}
    </div>
  )
}

function Accion({ label, children, ...rest }: { label: string; children: ReactNode } & ({ to: string } | { onClick: () => void })) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          "to" in rest ? (
            <Button render={<Link to={rest.to} />} nativeButton={false} variant="ghost" color="neutral" size="icon-sm" aria-label={label} />
          ) : (
            <Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={label} onClick={rest.onClick} />
          )
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function columnas(onVer: (f: FueraMatricula) => void, onOrientar: (f: FueraMatricula) => void): ColumnDef<FueraMatricula>[] {
  const c = (key: keyof FueraMatricula, label: string, cell?: (f: FueraMatricula) => ReactNode): ColumnDef<FueraMatricula> => ({
    id: key,
    accessorFn: (f) => f[key],
    meta: { label },
    header: ({ column }) => <DataTableColumnHeader column={column} title={label} />,
    cell: ({ row }) => (cell ? cell(row.original) : ((row.original[key] as ReactNode) ?? "—")),
    enableSorting: false,
  })
  return [
    c("estudiante", "Estudiante", (f) => <span className="font-medium">{f.estudiante}</span>),
    c("grado", "Grado"),
    c("municipio", "Municipio"),
    c("origen", "Origen"),
    c("situacion", "Situación", (f) => <Situacion f={f} />),
    c("fecha", "Fecha", (f) => fecha(f.fecha)),
    c("motivo", "Motivo"),
    {
      id: "actions",
      size: 48 * 4,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const f = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Accion label="Ver detalle" onClick={() => onVer(f)}>
              <EyeIcon />
            </Accion>
            {f.matriculaId ? (
              <Accion label="Ir a la matrícula" to={paths.app.coberturaMatriculaDetalle.getHref(String(f.matriculaId))}>
                <FileTextIcon />
              </Accion>
            ) : null}
            {f.situacion === "SIN_CUPO_PLATAFORMA" ? (
              <Accion label="Ir a Redistribución" to={`${paths.app.coberturaInscritos.getHref()}?tab=territorial&terr=redistribucion`}>
                <UsersIcon />
              </Accion>
            ) : (
              <Accion label="Ir a Reservas de cupo" to={`${paths.app.coberturaInscritos.getHref()}?tab=reservas`}>
                <CalendarDotsIcon />
              </Accion>
            )}
            <Accion label="Orientar al establecimiento" onClick={() => onOrientar(f)}>
              <ChatCircleDotsIcon />
            </Accion>
          </div>
        )
      },
      enableHiding: false,
      enableSorting: false,
    },
  ]
}

/**
 * Estudiantes fuera de matrícula (C.4.FUE.1; Sección 3.9): retirados, sin
 * continuidad y sin cupo en la plataforma, para focalizar la búsqueda activa.
 * Solo datos no sensibles.
 */
export function FueraMatriculaInforme({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const [ver, setVer] = useState<FueraMatricula | null>(null)
  const [orientar, setOrientar] = useState<FueraMatricula | null>(null)
  const body = { ...filtrosFuera(search), PAGEINDEX: pageIndex, PAGESIZE: pageSize }
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: [...informesKeys.all, "fuera-matricula", body] as const,
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>("/informes-reportes/fuera-matricula/query", body)
      return toPaginated(rows, { pageSize, map: (r) => camelizar<FueraMatricula>(r) })
    },
    placeholderData: keepPreviousData,
  })
  const { table } = useDataTable({
    columns: columnas(setVer, setOrientar),
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (f) => f.clave,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-informes-fuera-matricula",
  })

  return (
    <TableScreen>
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        {data ? (
          <p className="mb-3 text-sm font-medium tabular-nums">
            {data.totalCount === 1 ? "1 estudiante" : `${data.totalCount} estudiantes`}
          </p>
        ) : null}
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage="No hay estudiantes fuera de matrícula para estos filtros."
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
      {ver ? <DialogDetalle f={ver} onClose={() => setVer(null)} /> : null}
      {orientar ? <DialogOrientar f={orientar} onClose={() => setOrientar(null)} /> : null}
    </TableScreen>
  )
}

/** Ver detalle (C.4.FUE.2): situación, fecha y motivo, sin datos sensibles ni de contacto. */
function DialogDetalle({ f, onClose }: { f: FueraMatricula; onClose: () => void }) {
  const filas: [string, ReactNode][] = [
    ["Estudiante", f.estudiante],
    ["Grado", f.grado ?? "—"],
    ["Origen", [f.origen, f.municipio].filter(Boolean).join(" · ") || "—"],
    ["Situación", <Situacion key="s" f={f} />],
    ["Fecha", fecha(f.fecha)],
    ["Motivo", f.motivo ?? "—"],
  ]
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fuera de matrícula › {f.estudiante}</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
          {filas.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <Button type="button" variant="fill" color="primary" onClick={onClose}>
            Volver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Orientar al establecimiento (C.4.FUE.3): tema Permanencia y un texto sugerido; solo la entidad territorial envía. */
function DialogOrientar({ f, onClose }: { f: FueraMatricula; onClose: () => void }) {
  const { notify } = useNotify()
  const orientar = useOrientar()
  const [tema, setTema] = useState("Permanencia")
  const [texto, setTexto] = useState(
    `Seguimiento de un estudiante ${etiqueta(f.situacion).toLowerCase()} del grado ${f.grado ?? ""}: por favor contacte a la familia y registre la gestión de permanencia.`,
  )
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const valido = texto.trim().length > 0 && texto.length <= 1000

  function enviar() {
    if (!f.establecimientoId) return
    setErrorEnvio(null)
    orientar.mutate(
      { establecimientoId: f.establecimientoId, motivo: null, tema, orientacion: texto.trim() },
      {
        onSuccess: () => {
          notify("Orientación enviada al establecimiento.", { variant: "success" })
          onClose()
        },
        onError: (e) => setErrorEnvio(getErrorMessage(e)),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !orientar.isPending && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Orientar al establecimiento</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            Establecimiento: <b>{f.origen}</b>
          </p>
          <ComboOpciones
            id="fue-tema"
            label="Tema"
            required
            todos={false}
            value={tema}
            options={TEMAS_ORIENTACION.map((t) => ({ value: t, label: t }))}
            onChange={setTema}
          />
          <Field variant="outlined" className="gap-1.5">
            <FieldLabel htmlFor="fue-orientacion">
              Orientación<span data-required-mark="">*</span>
            </FieldLabel>
            <Textarea id="fue-orientacion" maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} />
            <FieldDescription>
              {texto.length} / 1000 · No incluya datos sensibles de estudiantes.
            </FieldDescription>
          </Field>
          {errorEnvio ? <p className="text-sm text-red">{errorEnvio}</p> : null}
        </div>
        <DialogFooter className="items-center">
          <span className="mr-auto text-xs text-muted-foreground">Los campos marcados con * son obligatorios</span>
          <Button type="button" variant="outline" color="neutral" onClick={onClose} disabled={orientar.isPending}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" onClick={enviar} disabled={!valido || orientar.isPending}>
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Filtros del informe: Año, Grado, Municipio, Establecimiento y Situación (C.4.FUE.1). */
export function FiltrosFuera() {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const { data: opciones } = useQuery({
    queryKey: [...informesKeys.all, "fuera-matricula-opciones"] as const,
    queryFn: async () => {
      const [fila] = await evalCol.getRows<{ opciones: { establecimientos: Opcion[]; municipios: Opcion[] } }>("/informes-reportes/fuera-matricula/opciones")
      return fila?.opciones
    },
    staleTime: 5 * 60_000,
  })
  const anio = new Date().getFullYear()
  const set = (k: string, v: string) =>
    navigate({ search: (prev) => ({ ...prev, [k]: v === "" ? undefined : k === "situacionFuera" ? v : Number(v), page: 0 }), replace: true })
  return (
    <>
      <ComboOpciones id="fue-anio" label="Año" size="sm" value={search.anio ? String(search.anio) : ""} options={[0, 1, 2, 3].map((i) => ({ value: String(anio - i), label: String(anio - i) }))} onChange={(v) => set("anio", v)} />
      <ComboOpciones id="fue-municipio" label="Municipio" size="sm" value={search.municipio ? String(search.municipio) : ""} options={opciones?.municipios ?? []} onChange={(v) => set("municipio", v)} />
      <ComboOpciones id="fue-establecimiento" label="Establecimiento" size="sm" value={search.establecimiento ? String(search.establecimiento) : ""} options={opciones?.establecimientos ?? []} onChange={(v) => set("establecimiento", v)} />
      <ComboOpciones id="fue-situacion" label="Situación" todos="Todas" size="sm" value={search.situacionFuera ?? ""} options={SITUACIONES_FUERA} onChange={(v) => set("situacionFuera", v)} />
    </>
  )
}

interface Opcion {
  value: string
  label: string
}
