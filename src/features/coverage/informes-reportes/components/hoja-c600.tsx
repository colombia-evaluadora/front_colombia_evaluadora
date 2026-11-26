"use no memo"

import { useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { SelectOpciones } from "@/components/select-opciones"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { EyeIcon, FileDownloadOutlinedIcon, FileTextIcon, InfoIcon, SpinnerIcon, WarningCircleIcon, XIcon } from "@/components/ui/icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { usePeriodosInformeQuery, type PeriodoInforme } from "@/features/coverage/informes-reportes/api/informes"
import {
  MODULOS_C600,
  SIN_DATO,
  descargarC600,
  useContenidoC600Query,
  useGenerarC600,
  useHojasC600Query,
  type HojaC600,
} from "@/features/coverage/informes-reportes/api/hoja-c600"
import { usePuedeGenerarExterno } from "@/features/coverage/informes-reportes/api/reportes-externos"

const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—")
const unicos = (xs: string[]) => [...new Set(xs.filter(Boolean))]

function Icono({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function columnas(descargando: number | null, onVer: (h: HojaC600) => void, onDescargar: (h: HojaC600) => void): ColumnDef<HojaC600>[] {
  const c = (key: keyof HojaC600, label: string, cell?: (h: HojaC600) => ReactNode): ColumnDef<HojaC600> => ({
    id: key,
    accessorFn: (h) => h[key],
    meta: { label },
    header: ({ column }) => <DataTableColumnHeader column={column} title={label} />,
    cell: ({ row }) => (cell ? cell(row.original) : ((row.original[key] as ReactNode) ?? "—")),
    enableSorting: false,
  })
  return [
    c("fecha", "Fecha", (h) => <span className="tabular-nums">{fecha(h.fecha)}</span>),
    c("usuario", "Usuario"),
    c("periodo", "Período Académico"),
    c("alcance", "Alcance"),
    {
      id: "actions",
      size: 48 * 2,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const h = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Icono label="Ver contenido" onClick={() => onVer(h)}>
              <EyeIcon />
            </Icono>
            <Icono label="Descargar (Excel)" disabled={descargando !== null} onClick={() => onDescargar(h)}>
              {descargando === h.generadoId ? <SpinnerIcon className="animate-spin" /> : <FileDownloadOutlinedIcon />}
            </Icono>
          </div>
        )
      },
    },
  ]
}

/** Recuadro de aviso del prototipo: azul informativo o ámbar de advertencia. */
function Caja({ tono, titulo, children }: { tono: "info" | "aviso"; titulo: string; children?: ReactNode }) {
  const info = tono === "info"
  return (
    <div className={info ? "flex gap-3 rounded-md border border-blue-stroke bg-blue-22 p-4 text-sm" : "flex gap-3 rounded-md border border-yellow-stroke bg-yellow-22 p-4 text-sm"}>
      {info ? <InfoIcon className="mt-0.5 size-5 shrink-0 text-blue" /> : <WarningCircleIcon className="mt-0.5 size-5 shrink-0 text-yellow" />}
      <div className="flex flex-col gap-2">
        <span className="font-medium">{titulo}</span>
        {children ? <span>{children}</span> : null}
      </div>
    </div>
  )
}

/**
 * Hoja de apoyo C600 (C.4.EXT.5): el C600 se diligencia en el aplicativo del DANE; aquí se generan
 * los valores que la plataforma ya calcula, en un Excel de estructura fija. Lista de generados con
 * Ver contenido y Descargar.
 */
export function HojaApoyoC600({ encabezado }: { encabezado: ReactNode }) {
  const { notify } = useNotify()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useHojasC600Query({ pageIndex, pageSize })
  const [descargando, setDescargando] = useState<number | null>(null)
  const [ver, setVer] = useState<HojaC600 | null>(null)

  async function descargar(h: HojaC600) {
    setDescargando(h.generadoId)
    const r = await descargarC600(h)
    setDescargando(null)
    notify(r.message, { variant: r.status === "error" ? "error" : "success" })
  }

  const { table } = useDataTable({
    columns: columnas(descargando, setVer, (h) => void descargar(h)),
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (h) => String(h.generadoId),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-informes-hoja-c600",
  })

  return (
    <TableScreen>
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        <div className="px-4 pt-4">
          <Caja tono="info" titulo="El formulario C600 se diligencia en el aplicativo del DANE.">
            Esta hoja trae, en Excel, los valores que la plataforma ya calcula, por módulo y pregunta, para copiarlos allí. Su
            estructura es fija: no tiene versión ni se configura.
          </Caja>
        </div>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage="No hay hojas de apoyo generadas. Use Generar hoja de apoyo para crear la primera."
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
      {ver ? <DialogContenidoC600 hoja={ver} onClose={() => setVer(null)} /> : null}
    </TableScreen>
  )
}

/** Botón Generar hoja de apoyo: Administrador o Gestor administrativo del establecimiento. */
export function GenerarHojaC600() {
  const puede = usePuedeGenerarExterno()
  const [abierto, setAbierto] = useState(false)
  if (!puede) return null
  return (
    <>
      <Button type="button" variant="fill" color="primary" size="sm" onClick={() => setAbierto(true)}>
        <FileTextIcon data-icon="inline-start" />
        Generar hoja de apoyo
      </Button>
      {abierto ? <DialogGenerarC600 onClose={() => setAbierto(false)} /> : null}
    </>
  )
}

function periodosUnicos(periodos: PeriodoInforme[]) {
  const vistos = new Map<string, PeriodoInforme>()
  for (const p of periodos) if (!vistos.has(p.nombre)) vistos.set(p.nombre, p)
  return [...vistos.values()]
}

/** Generar hoja de apoyo C600 (C.4.EXT.6): el período fija el año de referencia; sedes por defecto, todas. */
function DialogGenerarC600({ onClose }: { onClose: () => void }) {
  const { notify } = useNotify()
  const { data: periodos = [] } = usePeriodosInformeQuery()
  const generar = useGenerarC600()
  const sedesTodas = unicos(periodos.map((p) => p.sede))
  const [periodo, setPeriodo] = useState("")
  const [sedes, setSedes] = useState<string[] | null>(null)
  const [errorMsg, setErrorMsg] = useState<{ id: number; message: string } | null>(null)
  const elegidas = sedes ?? sedesTodas
  const establecimiento = periodos[0]?.establecimiento

  function confirmar() {
    setErrorMsg(null)
    generar.mutate(
      // Todas las sedes = arreglo vacío: el SSO toma las del establecimiento y lo marca "Todas las sedes".
      { periodo: Number(periodo), sedes: elegidas.length === sedesTodas.length ? [] : elegidas },
      {
        onSuccess: () => {
          notify("Se generó la hoja de apoyo C600.", { variant: "success" })
          onClose()
        },
        onError: (e) => setErrorMsg({ id: Date.now(), message: getErrorMessage(e) }),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !generar.isPending && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Generar hoja de apoyo C600{establecimiento ? ` — ${establecimiento}` : ""}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={errorMsg} onClose={() => setErrorMsg(null)} variant="error" />
        <ComboOpciones
          id="c600-periodo"
          label="Período Académico"
          required
          todos=""
          value={periodo}
          options={periodosUnicos(periodos).map((p) => ({ value: String(p.id), label: p.nombre }))}
          onChange={setPeriodo}
          description="Fija el año de referencia del formulario."
        />
        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="c600-sedes">
            Sedes<span data-required-mark="">*</span>
          </FieldLabel>
          <SelectOpciones
            id="c600-sedes"
            multiple
            placeholder="Seleccione"
            value={elegidas}
            opciones={sedesTodas.map((s) => ({ value: s, label: s }))}
            onValueChange={setSedes}
          />
          <FieldDescription>Las Sedes de su alcance; por defecto, todas.</FieldDescription>
        </Field>
        <Caja tono="info" titulo="Un libro de Excel con ocho hojas, una por módulo.">
          I. Carátula · II. Organización institucional (con las otras plantas físicas) · III. Personal · IV y V. Matrícula y
          docentes por jornada · VI. Poblaciones especiales · VII. Situación académica · VIII. TIC.
        </Caja>
        <Caja tono="aviso" titulo="Lo que el establecimiento no ha informado sale vacío y marcado «Sin dato en la plataforma».">
          Los datos de TIC y las otras plantas físicas salen de los datos de la Sede (Establecimiento, Sección 3.1).
        </Caja>
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            Los campos marcados con <span className="text-red">*</span> son obligatorios
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" color="neutral" onClick={onClose} disabled={generar.isPending}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
            <Button type="button" variant="fill" color="primary" disabled={!periodo || elegidas.length === 0 || generar.isPending} onClick={confirmar}>
              {generar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FileDownloadOutlinedIcon data-icon="inline-start" />}
              Generar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Contenido del Excel (C.4.EXT.7): una pestaña por módulo con pregunta, sede y jornada, valor y fuente. */
function DialogContenidoC600({ hoja, onClose }: { hoja: HojaC600; onClose: () => void }) {
  const { data = [], isPending, isError, error } = useContenidoC600Query(hoja.generadoId)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Hoja de apoyo C600 · contenido del Excel</DialogTitle>
        </DialogHeader>
        {isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <SpinnerIcon className="animate-spin" /> Cargando…
          </p>
        ) : isError ? (
          <p className="text-sm text-red">{getErrorMessage(error)}</p>
        ) : (
          <Tabs defaultValue="4">
            <TabsList className="flex-wrap">
              {MODULOS_C600.map((m) => (
                <TabsTrigger key={m.hoja} value={String(m.hoja)}>
                  {m.nombre}
                </TabsTrigger>
              ))}
            </TabsList>
            {MODULOS_C600.map((m) => (
              <TabsContent key={m.hoja} value={String(m.hoja)} className="max-h-[60vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Pregunta</th>
                      <th className="px-3 py-2 font-medium">Sede · Jornada</th>
                      <th className="px-3 py-2 text-right font-medium">Valor o cantidad</th>
                      <th className="px-3 py-2 font-medium">Fuente en la plataforma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data
                      .filter((f) => f.hoja === m.hoja)
                      .map((f, i) => (
                        <tr key={`${f.numero}-${f.sedeJornada}-${i}`} className="border-t">
                          <td className="px-3 py-2">{f.pregunta}</td>
                          <td className="px-3 py-2">{f.sedeJornada || "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {f.valor === SIN_DATO ? (
                              <Badge variant="soft" color="warning" className="text-xs">
                                {SIN_DATO}
                              </Badge>
                            ) : (
                              f.valor
                            )}
                          </td>
                          <td className="px-3 py-2">{f.fuente ?? "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </TabsContent>
            ))}
          </Tabs>
        )}
        <DialogFooter>
          <Button type="button" variant="fill" color="primary" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
