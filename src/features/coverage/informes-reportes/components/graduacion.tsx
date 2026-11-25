"use no memo"

import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { DatePicker } from "@/components/date-picker"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { MarcoOpciones } from "@/components/marco-opciones"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  ArrowUUpLeftIcon,
  CopyIcon,
  FilePdfIcon,
  GraduationCapIcon,
  ListChecksIcon,
  PersonCheckIcon,
  SpinnerIcon,
  WarningCircleIcon,
  XIcon,
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { coberturaInformesReportesRoute } from "@/router"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { fetchGrados, fetchGrupos } from "@/features/coverage/matricula/api/query/use-matricula-dependent-catalogs-query"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"
import {
  CAUSALES_DUPLICADO,
  REQUISITOS_MANUALES,
  SITUACIONES_GRADO,
  useAnularGraduacion,
  useExpedirDuplicado,
  useGenerarDiplomas,
  useGraduacionQuery,
  useMarcarRequisito,
  useRegistrarEntrega,
  useRegistrarGrado,
  useRequisitosGradoQuery,
  type Graduando,
} from "@/features/coverage/informes-reportes/api/graduacion"

type Accion = "requisitos" | "registrar" | "diploma" | "entrega" | "duplicado" | "anular"
type Aviso = { id: number; message: string } | null

const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—")
const nuevoAviso = (err: unknown): Aviso => ({ id: Date.now(), message: getErrorMessage(err) })

function Icono({ label, disabled, motivo, onClick, children }: { label: string; disabled?: boolean; motivo?: string; onClick: () => void; children: ReactNode }) {
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
      <TooltipContent>{disabled && motivo ? `${label}: ${motivo}` : label}</TooltipContent>
    </Tooltip>
  )
}

function columnas(onAccion: (g: Graduando, a: Accion) => void): ColumnDef<Graduando>[] {
  const c = (key: keyof Graduando, label: string, cell?: (g: Graduando) => ReactNode, centro = false): ColumnDef<Graduando> => ({
    id: key,
    accessorFn: (g) => g[key],
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
    c("documento", "Documento", (g) => <span className="tabular-nums">{g.documento}</span>),
    c("estudiante", "Estudiante", (g) => <span className="font-medium">{g.estudiante}</span>),
    c("grupo", "Grupo"),
    c("estado", "Estado", (g) => (
      <div className="flex flex-col items-start gap-1">
        <Badge variant="soft" color={g.estado === "Graduado" ? "success" : "info"} className="text-xs">
          {g.estado}
        </Badge>
        {g.estado === "Aprobado" && g.cumplidos < g.requisitos ? (
          <Badge variant="soft" color="warning" className="text-xs">
            Con requisitos pendientes
          </Badge>
        ) : null}
      </div>
    )),
    c("cumplidos", "Requisitos", (g) => (
      <span className="tabular-nums" title={g.faltan ?? undefined}>
        {g.cumplidos} de {g.requisitos}
      </span>
    ), true),
    c("acta", "Acta", undefined, true),
    c("diploma", "Diploma N.º", undefined, true),
    c("entrega", "Entrega", (g) => fecha(g.entrega), true),
    {
      id: "actions",
      size: 48 * 6,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const g = row.original
        const graduado = g.estado === "Graduado"
        return (
          <div className="flex items-center justify-end gap-1">
            <Icono label="Requisitos de grado" onClick={() => onAccion(g, "requisitos")}>
              <ListChecksIcon />
            </Icono>
            <Icono label="Registrar grado" onClick={() => onAccion(g, "registrar")} disabled={graduado} motivo="ya está graduado">
              <GraduationCapIcon />
            </Icono>
            <Icono label="Generar diploma" onClick={() => onAccion(g, "diploma")} disabled={!graduado} motivo="solo con el estudiante Graduado">
              <FilePdfIcon />
            </Icono>
            <Icono label="Registrar entrega del diploma" onClick={() => onAccion(g, "entrega")} disabled={!g.diplomaEmitido} motivo="primero genere el diploma">
              <PersonCheckIcon />
            </Icono>
            <Icono label="Expedir duplicado" onClick={() => onAccion(g, "duplicado")} disabled={!g.entrega} motivo="solo con el diploma entregado">
              <CopyIcon />
            </Icono>
            <Icono label="Anular graduación" onClick={() => onAccion(g, "anular")} disabled={!graduado || g.diplomaEmitido} motivo={graduado ? "el diploma ya fue emitido" : "no está graduado"}>
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
 * Graduación (C.4.GRA.1): matrículas Aprobado y Graduado del último grado de la Media, con sus
 * requisitos, acta, diploma y entrega. Acciones por fila y en lote (Marcar requisito, Registrar
 * grado, Generar diplomas).
 */
export function GraduacionInforme({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const { notify } = useNotify()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useGraduacionQuery(search, { pageIndex, pageSize })
  const [accion, setAccion] = useState<{ sel: Graduando[]; a: Accion | "marcar" } | null>(null)
  const diplomas = useGenerarDiplomas()
  const { table, selectedRows, hasSelection, resetSelection } = useDataTable({
    columns: columnas((g, a) => (a === "diploma" ? generarDiplomas([g]) : setAccion({ sel: [g], a }))),
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (g) => g.matriculaId,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-informes-graduacion",
  })

  function generarDiplomas(sel: Graduando[]) {
    diplomas.mutate(
      { ids: sel.map((g) => g.matriculaId) },
      {
        onSuccess: () => notify(sel.length === 1 ? `Se generó el diploma de ${sel[0].estudiante}.` : `Se generaron ${sel.length} diplomas.`),
        onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
      },
    )
  }

  const todosAprobado = selectedRows.length > 0 && selectedRows.every((g) => g.estado === "Aprobado")
  const todosGraduado = selectedRows.length > 0 && selectedRows.every((g) => g.estado === "Graduado")

  return (
    <TableScreen>
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        {hasSelection ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="mr-auto font-medium">{selectedRows.length} marcadas</span>
            <Button type="button" size="sm" variant="outline" color="neutral" onClick={() => setAccion({ sel: selectedRows, a: "marcar" })}>
              <ListChecksIcon data-icon="inline-start" />
              Marcar requisito
            </Button>
            {todosAprobado ? (
              <Button type="button" size="sm" variant="outline" color="neutral" onClick={() => setAccion({ sel: selectedRows, a: "registrar" })}>
                <GraduationCapIcon data-icon="inline-start" />
                Registrar grado
              </Button>
            ) : null}
            {todosGraduado ? (
              <Button type="button" size="sm" variant="outline" color="neutral" disabled={diplomas.isPending} onClick={() => generarDiplomas(selectedRows)}>
                {diplomas.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FilePdfIcon data-icon="inline-start" />}
                Generar diplomas
              </Button>
            ) : null}
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
          emptyMessage="No hay matrículas Aprobado ni Graduado del último grado de la Media con estos filtros."
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
      {accion?.a === "requisitos" ? <DialogRequisitos g={accion.sel[0]} onClose={() => setAccion(null)} /> : null}
      {accion?.a === "marcar" ? <DialogMarcarRequisito sel={accion.sel} onClose={() => setAccion(null)} onDone={resetSelection} /> : null}
      {accion?.a === "registrar" ? <DialogRegistrarGrado sel={accion.sel} onClose={() => setAccion(null)} onDone={resetSelection} /> : null}
      {accion?.a === "anular" ? <DialogAnular g={accion.sel[0]} onClose={() => setAccion(null)} /> : null}
      {accion?.a === "entrega" ? <DialogEntrega g={accion.sel[0]} onClose={() => setAccion(null)} /> : null}
      {accion?.a === "duplicado" ? <DialogDuplicado g={accion.sel[0]} onClose={() => setAccion(null)} /> : null}
    </TableScreen>
  )
}

/** Grupo y Situación (C.4.GRA.1); el grupo sale del último grado del período elegido. */
export function FiltrosGraduacion() {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const set = (k: string, v: string) => navigate({ search: (prev) => ({ ...prev, [k]: v || undefined, page: 0 }), replace: true })
  const { data: grupos = [] } = useQuery({
    queryKey: [...informesKeys.all, "graduacion", "grupos", search.periodo ?? "none", search.jornada ?? ""] as const,
    queryFn: async () => {
      const grados = await fetchGrados(search.periodo ?? 0)
      const ultimo = grados.filter((g) => g.valor >= 11).at(-1)
      return ultimo ? fetchGrupos(ultimo.id, search.jornada) : []
    },
    enabled: Boolean(search.periodo),
  })
  return (
    <>
      <ComboOpciones
        id="gra-grupo"
        label="Grupo"
        todos="Todos"
        size="sm"
        value={search.grupo ?? ""}
        options={grupos.map((g) => ({ value: g.codigo, label: g.codigo }))}
        onChange={(v) => set("grupo", v)}
      />
      <ComboOpciones id="gra-situacion" label="Situación" todos="Todas" size="sm" value={search.situacionGrado ?? ""} options={SITUACIONES_GRADO} onChange={(v) => set("situacionGrado", v)} />
    </>
  )
}

function Pie({ pendiente, disabled, onCancel, onOk, label, obligatorios = true }: { pendiente: boolean; disabled?: boolean; onCancel: () => void; onOk: () => void; label: string; obligatorios?: boolean }) {
  return (
    <DialogFooter className="items-center">
      {obligatorios ? <span className="mr-auto text-xs text-muted-foreground">Los campos marcados con * son obligatorios</span> : null}
      <Button type="button" variant="outline" color="neutral" size="sm" onClick={onCancel} disabled={pendiente}>
        <XIcon data-icon="inline-start" />
        Cancelar
      </Button>
      <Button type="button" variant="fill" color="primary" size="sm" disabled={disabled || pendiente} onClick={onOk}>
        {pendiente ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : null}
        {label}
      </Button>
    </DialogFooter>
  )
}

function Texto({ id, label, value, onChange, max, min = 0, required = false }: { id: string; label: string; value: string; onChange: (v: string) => void; max: number; min?: number; required?: boolean }) {
  const n = value.trim().length
  const invalido = (required || n > 0) && (n < min || n > max)
  return (
    <Field variant="outlined" className="gap-1.5" data-invalid={invalido || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? <span data-required-mark="">*</span> : null}
      </FieldLabel>
      <Textarea id={id} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} rows={3} />
      <div className="flex justify-between gap-2">
        <FieldDescription className={cn(invalido && "text-red")}>{min > 0 ? `Entre ${min} y ${max} caracteres.` : ""}</FieldDescription>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value.length} / {max}
        </span>
      </div>
    </Field>
  )
}

/** Requisitos de grado (C.4.GRA.3): los del sistema en solo lectura y los que se marcan. */
function DialogRequisitos({ g, onClose }: { g: Graduando; onClose: () => void }) {
  const { notify } = useNotify()
  const { data = [], isPending } = useRequisitosGradoQuery(g.matriculaId)
  const marcar = useMarcarRequisito()
  const [cambios, setCambios] = useState<Record<string, boolean>>({})
  const [aviso, setAviso] = useState<Aviso>(null)

  async function guardar() {
    try {
      for (const [codigo, cumplido] of Object.entries(cambios)) {
        await marcar.mutateAsync({ ids: [g.matriculaId], codigo, cumplido })
      }
      notify(`Se guardaron los requisitos de ${g.estudiante}.`)
      onClose()
    } catch (err) {
      setAviso(nuevoAviso(err))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !marcar.isPending && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Requisitos de grado</DialogTitle>
          <DialogDescription>
            {g.estudiante} · {g.grupo} · {g.estado}
          </DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        {isPending ? (
          <SpinnerIcon className="mx-auto animate-spin" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1.5 font-medium">Requisito</th>
                <th className="py-1.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const cumplido = cambios[r.codigo] ?? r.cumplido
                return (
                  <tr key={r.codigo} className="border-b last:border-0">
                    <td className="py-2">{r.nombre}</td>
                    <td className="py-2">
                      {r.delSistema ? (
                        <span className="flex items-center gap-2">
                          <Badge variant="soft" color={r.cumplido ? "success" : "warning"} className="text-xs">
                            {r.cumplido ? "Cumplido" : "Pendiente"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{r.detalle}</span>
                        </span>
                      ) : (
                        <label className="flex items-center gap-2">
                          <Switch checked={cumplido} onCheckedChange={(v) => setCambios((c) => ({ ...c, [r.codigo]: v }))} />
                          <span>{cumplido ? "Cumplido" : "Pendiente"}</span>
                        </label>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <Pie pendiente={marcar.isPending} disabled={Object.keys(cambios).length === 0} onCancel={onClose} onOk={guardar} label="Guardar" obligatorios={false} />
      </DialogContent>
    </Dialog>
  )
}

/** Marcar requisito en lote: un requisito que se marca, Cumplido o Pendiente, para las marcadas. */
function DialogMarcarRequisito({ sel, onClose, onDone }: { sel: Graduando[]; onClose: () => void; onDone: () => void }) {
  const { notify } = useNotify()
  const marcar = useMarcarRequisito()
  const [codigo, setCodigo] = useState("")
  const [cumplido, setCumplido] = useState(true)
  const [aviso, setAviso] = useState<Aviso>(null)
  return (
    <Dialog open onOpenChange={(o) => !o && !marcar.isPending && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar requisito</DialogTitle>
          <DialogDescription>{sel.length} matrículas marcadas</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <ComboOpciones id="gra-marcar-req" label="Requisito *" value={codigo} options={REQUISITOS_MANUALES} onChange={setCodigo} />
        <MarcoOpciones id="gra-marcar-estado" label="Estado">
          <RadioGroup value={cumplido ? "S" : "N"} onValueChange={(v) => setCumplido(v === "S")} className="flex gap-x-5">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="S" />
              Cumplido
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="N" />
              Pendiente
            </label>
          </RadioGroup>
        </MarcoOpciones>
        <Pie
          pendiente={marcar.isPending}
          disabled={!codigo}
          onCancel={onClose}
          label="Marcar"
          onOk={() =>
            marcar.mutate(
              { ids: sel.map((g) => g.matriculaId), codigo, cumplido },
              {
                onSuccess: () => {
                  notify(`Se marcó el requisito en ${sel.length} matrículas.`)
                  onDone()
                  onClose()
                },
                onError: (err) => setAviso(nuevoAviso(err)),
              },
            )
          }
        />
      </DialogContent>
    </Dialog>
  )
}

/** Registrar grado (C.4.GRA.7): una fecha, acta, modalidad y observación para todas; quien no cumple sigue Aprobado. */
function DialogRegistrarGrado({ sel, onClose, onDone }: { sel: Graduando[]; onClose: () => void; onDone: () => void }) {
  const { notify } = useNotify()
  const registrar = useRegistrarGrado()
  const [fechaGrado, setFechaGrado] = useState<Date | undefined>(new Date())
  const [acta, setActa] = useState("")
  const [modalidad, setModalidad] = useState<"CEREMONIA" | "VENTANILLA">("CEREMONIA")
  const [observacion, setObservacion] = useState("")
  const [aviso, setAviso] = useState<Aviso>(null)
  const noCumplen = sel.filter((g) => g.cumplidos < g.requisitos)
  const valido = Boolean(fechaGrado) && acta.trim().length > 0 && acta.trim().length <= 30

  return (
    <Dialog open onOpenChange={(o) => !o && !registrar.isPending && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar grado</DialogTitle>
          <DialogDescription>{sel.map((g) => g.estudiante).join(" · ")}</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        {noCumplen.length ? (
          <div className="rounded-md border border-yellow-stroke bg-yellow-22 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <WarningCircleIcon />
              No cumplen los requisitos de grado y no se graduarán:
            </p>
            <ul className="mt-1 list-disc pl-6">
              {noCumplen.map((g) => (
                <li key={g.matriculaId}>
                  <span className="font-semibold">{g.estudiante}</span> — {g.faltan}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field variant="outlined" className="gap-1.5">
            <FieldLabel htmlFor="gra-fecha">
              Fecha de grado<span data-required-mark="">*</span>
            </FieldLabel>
            <DatePicker id="gra-fecha" value={fechaGrado} onChange={setFechaGrado} maxDate={new Date()} />
          </Field>
          <Field variant="outlined" className="gap-1.5">
            <FieldLabel htmlFor="gra-acta">
              Número de acta<span data-required-mark="">*</span>
            </FieldLabel>
            <Input id="gra-acta" variant="outlined" maxLength={30} value={acta} onChange={(e) => setActa(e.target.value)} />
            <span className="self-end text-xs text-muted-foreground tabular-nums">{acta.length} / 30</span>
          </Field>
        </div>
        <MarcoOpciones id="gra-modalidad" label="Modalidad" required>
          <RadioGroup value={modalidad} onValueChange={(v) => setModalidad(v as "CEREMONIA" | "VENTANILLA")} className="flex gap-x-5">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="CEREMONIA" />
              Ceremonia
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="VENTANILLA" />
              Ventanilla
            </label>
          </RadioGroup>
        </MarcoOpciones>
        <Texto id="gra-obs" label="Observación" value={observacion} onChange={setObservacion} max={500} />
        <Pie
          pendiente={registrar.isPending}
          disabled={!valido || noCumplen.length === sel.length}
          onCancel={onClose}
          label="Registrar grado"
          onOk={() =>
            registrar.mutate(
              { ids: sel.map((g) => g.matriculaId), fecha: fechaGrado as Date, acta, modalidad, observacion },
              {
                onSuccess: (filas) => {
                  const n = filas.filter((f) => f.graduado).length
                  notify(n === 1 ? "Se registró el grado de 1 estudiante." : `Se registró el grado de ${n} estudiantes.`)
                  onDone()
                  onClose()
                },
                onError: (err) => setAviso(nuevoAviso(err)),
              },
            )
          }
        />
      </DialogContent>
    </Dialog>
  )
}

/** Anular graduación (C.4.GRA.4): con motivo, mientras no se haya emitido el diploma. */
function DialogAnular({ g, onClose }: { g: Graduando; onClose: () => void }) {
  const { notify } = useNotify()
  const anular = useAnularGraduacion()
  const [motivo, setMotivo] = useState("")
  const [aviso, setAviso] = useState<Aviso>(null)
  const n = motivo.trim().length
  return (
    <Dialog open onOpenChange={(o) => !o && !anular.isPending && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WarningCircleIcon className="text-red" />
            Anular graduación — {g.estudiante}
          </DialogTitle>
          <DialogDescription>La matrícula vuelve a Aprobado y se quita su fecha de grado y su acta. Úselo solo para corregir un grado registrado por error.</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <Texto id="gra-motivo" label="Motivo" value={motivo} onChange={setMotivo} min={10} max={500} required />
        <Pie
          pendiente={anular.isPending}
          disabled={n < 10 || n > 500}
          onCancel={onClose}
          label="Anular graduación"
          onOk={() =>
            anular.mutate(
              { id: g.matriculaId, motivo },
              {
                onSuccess: () => {
                  notify(`Se anuló la graduación de ${g.estudiante}.`)
                  onClose()
                },
                onError: (err) => setAviso(nuevoAviso(err)),
              },
            )
          }
        />
      </DialogContent>
    </Dialog>
  )
}

/** Registrar entrega del diploma (C.4.GRA.5): fecha y quién lo recibe. */
function DialogEntrega({ g, onClose }: { g: Graduando; onClose: () => void }) {
  const { notify } = useNotify()
  const entrega = useRegistrarEntrega()
  const [fechaEntrega, setFechaEntrega] = useState<Date | undefined>(new Date())
  const [recibe, setRecibe] = useState<"GRADUADO" | "AUTORIZADO">("GRADUADO")
  const [nombre, setNombre] = useState("")
  const [documento, setDocumento] = useState("")
  const [observacion, setObservacion] = useState("")
  const [aviso, setAviso] = useState<Aviso>(null)
  const valido = Boolean(fechaEntrega) && (recibe === "GRADUADO" || (nombre.trim() && documento.trim()))
  return (
    <Dialog open onOpenChange={(o) => !o && !entrega.isPending && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar entrega del diploma</DialogTitle>
          <DialogDescription>
            {g.estudiante} · Diploma N.º {g.diploma}
          </DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="gra-entrega-fecha">
            Fecha de entrega<span data-required-mark="">*</span>
          </FieldLabel>
          <DatePicker id="gra-entrega-fecha" value={fechaEntrega} onChange={setFechaEntrega} maxDate={new Date()} />
        </Field>
        <MarcoOpciones id="gra-recibe" label="Recibe" required>
          <RadioGroup value={recibe} onValueChange={(v) => setRecibe(v as "GRADUADO" | "AUTORIZADO")} className="flex gap-x-5">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="GRADUADO" />
              El graduado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="AUTORIZADO" />
              Un autorizado
            </label>
          </RadioGroup>
        </MarcoOpciones>
        {recibe === "AUTORIZADO" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field variant="outlined" className="gap-1.5">
              <FieldLabel htmlFor="gra-aut-nombre">
                Nombre del autorizado<span data-required-mark="">*</span>
              </FieldLabel>
              <Input id="gra-aut-nombre" variant="outlined" maxLength={150} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Field>
            <Field variant="outlined" className="gap-1.5">
              <FieldLabel htmlFor="gra-aut-doc">
                Documento<span data-required-mark="">*</span>
              </FieldLabel>
              <Input id="gra-aut-doc" variant="outlined" maxLength={30} value={documento} onChange={(e) => setDocumento(e.target.value)} />
            </Field>
          </div>
        ) : null}
        <Texto id="gra-entrega-obs" label="Observación" value={observacion} onChange={setObservacion} max={500} />
        <Pie
          pendiente={entrega.isPending}
          disabled={!valido}
          onCancel={onClose}
          label="Registrar entrega"
          onOk={() =>
            entrega.mutate(
              { id: g.matriculaId, fecha: fechaEntrega as Date, recibe, nombre, documento, observacion },
              {
                onSuccess: () => {
                  notify(`Se registró la entrega del diploma de ${g.estudiante}.`)
                  onClose()
                },
                onError: (err) => setAviso(nuevoAviso(err)),
              },
            )
          }
        />
      </DialogContent>
    </Dialog>
  )
}

/** Expedir duplicado del diploma (C.4.GRA.6): causal, soporte obligatorio, fecha y observación. */
function DialogDuplicado({ g, onClose }: { g: Graduando; onClose: () => void }) {
  const { notify } = useNotify()
  const duplicado = useExpedirDuplicado()
  const [causal, setCausal] = useState("")
  const [soporte, setSoporte] = useState<File | null>(null)
  const [fechaExp, setFechaExp] = useState<Date | undefined>(new Date())
  const [observacion, setObservacion] = useState("")
  const [aviso, setAviso] = useState<Aviso>(null)
  const ayuda = CAUSALES_DUPLICADO.find((c) => c.value === causal)
  const hoy = new Date().toLocaleDateString("es-CO")
  return (
    <Dialog open onOpenChange={(o) => !o && !duplicado.isPending && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Expedir duplicado del diploma</DialogTitle>
          <DialogDescription>
            {g.estudiante} · Diploma N.º {g.diploma} · entregado el {fecha(g.entrega)}
          </DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <MarcoOpciones id="gra-causal" label="Causal" required>
          <RadioGroup value={causal} onValueChange={(v) => setCausal(String(v))} className="grid gap-2 sm:grid-cols-2">
            {CAUSALES_DUPLICADO.map((c) => (
              <label key={c.value} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={c.value} />
                {c.label}
              </label>
            ))}
          </RadioGroup>
        </MarcoOpciones>
        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="gra-soporte">
            Soporte<span data-required-mark="">*</span>
          </FieldLabel>
          <Input id="gra-soporte" type="file" variant="outlined" accept=".pdf,image/*" onChange={(e) => setSoporte(e.target.files?.[0] ?? null)} />
          <FieldDescription>{ayuda ? `${ayuda.label}: ${ayuda.soporte}.` : "Elija la causal para saber qué soporte adjuntar."}</FieldDescription>
        </Field>
        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="gra-dup-fecha">
            Fecha de expedición<span data-required-mark="">*</span>
          </FieldLabel>
          <DatePicker id="gra-dup-fecha" value={fechaExp} onChange={setFechaExp} maxDate={new Date()} />
        </Field>
        <Texto id="gra-dup-obs" label="Observación" value={observacion} onChange={setObservacion} max={500} />
        <p className="text-xs text-muted-foreground">
          El duplicado lleva la leyenda «DUPLICADO — expedido el {fechaExp ? fechaExp.toLocaleDateString("es-CO") : hoy}»; el diploma anterior queda Reemplazado en la verificación.
        </p>
        <Pie
          pendiente={duplicado.isPending}
          disabled={!causal || !soporte || !fechaExp}
          onCancel={onClose}
          label="Expedir duplicado"
          onOk={() =>
            duplicado.mutate(
              { id: g.matriculaId, causal, soporte: soporte as File, fecha: fechaExp as Date, observacion },
              {
                onSuccess: () => {
                  notify(`Se expidió el duplicado del diploma de ${g.estudiante}. Genérelo desde la fila para imprimirlo.`)
                  onClose()
                },
                onError: (err) => setAviso(nuevoAviso(err)),
              },
            )
          }
        />
      </DialogContent>
    </Dialog>
  )
}
