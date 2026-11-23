import { useRef, useState, type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  CheckIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  FileDownloadOutlinedIcon,
  PaperclipIcon,
  PlusIcon,
  SpinnerIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { useUser } from "@/lib/auth"
import { Input } from "@/components/ui/input"
import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"
import {
  formatearFecha,
  formatearTamano,
  NOMBRE_SOPORTE,
  REVISION_SOPORTE,
  acceptDe,
  SOPORTE_ACCEPT,
  SOPORTES_FIJOS,
  useCargarSoporte,
  useDocumentosConvenioQuery,
  useMarcarDocumentoConvenio,
  useQuitarSoporte,
  useRevisarSoporte,
  useSoportesQuery,
  validarArchivoSoporte,
  type RevisionSoporte,
  type Soporte,
  type TipoSoporte,
} from "@/features/coverage/matricula/api/soportes"
import { MatriculaFormSection } from "./fields"

type Aviso = { id: number; message: string } | null
const OBS_MIN = 10
const OBS_MAX = 500

const COLOR_REVISION: Record<RevisionSoporte, "success" | "warning" | "destructive" | "muted"> = {
  SOPORTADO: "success",
  SOPORTADO_OBSERVACIONES: "warning",
  NO_SOPORTADO: "destructive",
  SIN_REVISAR: "muted",
}

export function RevisionBadge({ revision }: { revision: RevisionSoporte }) {
  return (
    <Badge variant="outline" color={COLOR_REVISION[revision]} className="rounded-full text-xs font-medium tracking-normal">
      {REVISION_SOPORTE[revision]}
    </Badge>
  )
}

/** Fila de la tabla: los fijos siempre aparecen, cargados o no. */
export interface FilaSoporte {
  key: string
  tipo: TipoSoporte
  etiqueta: string
  sub?: string
  soporte: Soporte | null
}

export function armarFilas(soportes: Soporte[]): FilaSoporte[] {
  const fijos = SOPORTES_FIJOS.map((tipo): FilaSoporte => {
    const soporte = soportes.find((s) => s.tipo === tipo && s.archivoId != null) ?? null
    return { key: tipo, tipo, etiqueta: NOMBRE_SOPORTE[tipo], soporte }
  })
  const otros = soportes.filter((s) => s.tipo === "OTRO")
  return [
    ...fijos,
    ...otros.map(
      (s, i): FilaSoporte => ({
        key: `OTRO-${s.id}`,
        tipo: "OTRO",
        etiqueta: NOMBRE_SOPORTE.OTRO,
        sub: `Documento ${i + 1} de ${otros.length}`,
        soporte: s,
      }),
    ),
  ]
}

interface SoportesSectionProps {
  matriculaId: string
  editable: boolean
  /** Complementaria por adscripción: suma los documentos requeridos del convenio. */
  porAdscripcion?: boolean
}

/**
 * Bloque 14 (informe 2.14, Reglas 6, 23 y 73): una fila por soporte con su
 * revisión. Cada operación se guarda al momento, no con el botón Guardar de la
 * matrícula; la revisión nunca impide la matrícula.
 */
export function MatriculaSoportesSection({ matriculaId, editable, porAdscripcion = false }: SoportesSectionProps) {
  const { notify } = useNotify()
  const soportesQuery = useSoportesQuery(matriculaId)
  const cargar = useCargarSoporte(matriculaId)
  const inputRef = useRef<HTMLInputElement>(null)
  // A qué fila va el archivo elegido con el input oculto (adjuntar o agregar).
  const destino = useRef<{ tipo: TipoSoporte; id: number | null } | null>(null)

  const [viendo, setViendo] = useState<FilaSoporte | null>(null)
  const [revisando, setRevisando] = useState<FilaSoporte | null>(null)
  const [reemplazando, setReemplazando] = useState<FilaSoporte | null>(null)
  const [quitando, setQuitando] = useState<FilaSoporte | null>(null)

  const filas = armarFilas(soportesQuery.data ?? [])

  function elegirArchivo(tipo: TipoSoporte, id: number | null) {
    destino.current = { tipo, id }
    if (inputRef.current) inputRef.current.accept = acceptDe(tipo)
    inputRef.current?.click()
  }

  function onArchivoElegido(archivo: File | undefined) {
    const d = destino.current
    if (inputRef.current) inputRef.current.value = ""
    if (!archivo || !d) return
    const error = validarArchivoSoporte(archivo, d.tipo)
    if (error) {
      notify(error, { variant: "error" })
      return
    }
    cargar.mutate(
      { tipo: d.tipo, id: d.id, archivo },
      {
        onSuccess: () => notify(`${archivo.name} cargado.`),
        onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
      },
    )
  }

  return (
    <MatriculaFormSection title="Archivo de soporte" columns={2}>
      <div className="flex flex-col gap-3 md:col-span-2">
        <input
          ref={inputRef}
          type="file"
          accept={SOPORTE_ACCEPT}
          className="hidden"
          onChange={(e) => onArchivoElegido(e.target.files?.[0])}
        />
        {soportesQuery.isPending ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Cargando soportes…</p>
        ) : soportesQuery.isError ? (
          <p className="py-6 text-center text-sm text-red">{getErrorMessage(soportesQuery.error)}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Soporte</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead>Revisión</TableHead>
                <TableHead>Revisado por y fecha</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((fila) => {
                const s = fila.soporte
                const cargado = s?.archivoId != null
                return (
                  <TableRow key={fila.key}>
                    <TableCell>
                      <span className="block">{fila.etiqueta}</span>
                      {fila.sub ? <span className="block text-xs text-muted-foreground">{fila.sub}</span> : null}
                    </TableCell>
                    <TableCell>
                      {cargado ? (
                        <span className="text-sm">
                          {s.archivoNombre} · {formatearTamano(s.archivoTamano)}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          color="neutral"
                          size="sm"
                          disabled={!editable || cargar.isPending}
                          onClick={() => elegirArchivo(fila.tipo, null)}
                        >
                          <PaperclipIcon data-icon="inline-start" />
                          Adjuntar archivo
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <RevisionBadge revision={s?.revision ?? "SIN_REVISAR"} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {s?.revisadoPor ? `${s.revisadoPor} · ${formatearFecha(s.revisadoAt)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              color="neutral"
                              size="icon-sm"
                              aria-label={`Acciones de ${fila.sub ? `${fila.etiqueta}, ${fila.sub}` : fila.etiqueta}`}
                            />
                          }
                        >
                          <DotsThreeVerticalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44">
                          <DropdownMenuItem disabled={!cargado} onClick={() => setViendo(fila)}>
                            <EyeIcon /> Ver archivo
                          </DropdownMenuItem>
                          {editable ? (
                            <>
                              <DropdownMenuItem disabled={!cargado} onClick={() => setReemplazando(fila)}>
                                <UploadSimpleIcon /> Reemplazar
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={!cargado} onClick={() => setRevisando(fila)}>
                                <CheckIcon /> Revisar soporte
                              </DropdownMenuItem>
                              {fila.tipo === "OTRO" ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem variant="destructive" onClick={() => setQuitando(fila)}>
                                    <TrashIcon /> Quitar
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        {editable ? (
          <div>
            <Button
              type="button"
              variant="outline"
              color="primary"
              size="sm"
              disabled={cargar.isPending}
              onClick={() => elegirArchivo("OTRO", null)}
            >
              {cargar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <PlusIcon data-icon="inline-start" />}
              Agregar documento
            </Button>
          </div>
        ) : null}

        {porAdscripcion ? <DocumentosConvenio matriculaId={matriculaId} editable={editable} /> : null}
      </div>

      {viendo?.soporte ? <DialogVerSoporte fila={viendo} onClose={() => setViendo(null)} /> : null}
      {revisando?.soporte ? (
        <DialogRevisarSoporte matriculaId={matriculaId} fila={revisando} onClose={() => setRevisando(null)} />
      ) : null}
      {reemplazando?.soporte ? (
        <DialogReemplazarSoporte matriculaId={matriculaId} fila={reemplazando} onClose={() => setReemplazando(null)} />
      ) : null}
      {quitando?.soporte ? (
        <DialogQuitarSoporte matriculaId={matriculaId} fila={quitando} onClose={() => setQuitando(null)} />
      ) : null}
    </MatriculaFormSection>
  )
}

function Ficha({ filas }: { filas: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
      {filas.map(([t, v]) => (
        <div key={t} className="contents">
          <dt className="text-muted-foreground">{t}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Ver archivo (EDI.1h): vista previa y, al lado, la ficha con la revisión vigente. */
/** Vista previa del soporte; la reusa la ficha de una reserva (Asignar grupo). */
export function DialogVerSoporte({ fila, onClose }: { fila: FilaSoporte; onClose: () => void }) {
  const s = fila.soporte as Soporte
  const { data: url, isPending } = useArchivoViewUrl(s.archivoId)
  const esPdf = (s.archivoNombre ?? "").toLowerCase().endsWith(".pdf")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{fila.sub ? `${fila.etiqueta} · ${fila.sub}` : fila.etiqueta}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
          <div className="flex min-h-96 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
            {isPending || !url ? (
              <SpinnerIcon className="animate-spin text-muted-foreground" aria-label="Cargando vista previa" />
            ) : esPdf ? (
              <iframe src={url} title={`Vista previa de ${s.archivoNombre}`} className="h-[32rem] w-full" />
            ) : (
              <img src={url} alt={`Vista previa de ${s.archivoNombre}`} className="max-h-[32rem] object-contain" />
            )}
          </div>
          <Ficha
            filas={[
              ["Soporte", fila.etiqueta],
              ["Archivo", `${s.archivoNombre} · ${formatearTamano(s.archivoTamano)}`],
              ["Subido por", s.subidoPor ? `${s.subidoPor} · ${formatearFecha(s.subidoAt)}` : "—"],
              ["Revisión", <RevisionBadge key="r" revision={s.revision} />],
              ["Revisado por", s.revisadoPor ? `${s.revisadoPor} · ${formatearFecha(s.revisadoAt)}` : "—"],
              ...(s.observacion ? ([["Observación", s.observacion]] as [string, ReactNode][]) : []),
            ]}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            color="neutral"
            size="sm"
            disabled={!url}
            nativeButton={false}
            render={<a href={url} download={s.archivoNombre ?? undefined} />}
          >
            <FileDownloadOutlinedIcon data-icon="inline-start" />
            Descargar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Revisión elegida en el modal, para guardarla después (Asignar grupo de una reserva). */
export interface RevisionPendiente {
  resultado: Exclude<RevisionSoporte, "SIN_REVISAR">
  observacion: string
}

interface DialogSoporteProps {
  matriculaId: string
  fila: FilaSoporte
  onClose: () => void
}

/**
 * Revisar soporte (EDI.1c, Regla 73): la observación es obligatoria salvo en Soportado. Con
 * `onGuardar` no llama al back: Asignar grupo la aplica a la matrícula nueva al crearla.
 */
export function DialogRevisarSoporte({
  matriculaId,
  fila,
  onClose,
  onGuardar,
}: DialogSoporteProps & { onGuardar?: (revision: RevisionPendiente) => void }) {
  const s = fila.soporte as Soporte
  const { notify } = useNotify()
  const revisar = useRevisarSoporte(matriculaId)
  const [resultado, setResultado] = useState<Exclude<RevisionSoporte, "SIN_REVISAR"> | null>(
    s.revision === "SIN_REVISAR" ? null : s.revision,
  )
  const [observacion, setObservacion] = useState(s.observacion ?? "")
  const [intento, setIntento] = useState(false)
  const [aviso, setAviso] = useState<Aviso>(null)
  // Revisado por y fecha: automáticos, el usuario actual y hoy.
  const { data: usuario } = useUser()
  const [hoy] = useState(() => new Date().toISOString())

  const pideObservacion = resultado != null && resultado !== "SOPORTADO"
  const largo = observacion.trim().length
  const obsInvalida = pideObservacion ? largo < OBS_MIN || largo > OBS_MAX : largo > 0 && largo < OBS_MIN
  const invalido = resultado == null || obsInvalida

  function guardar() {
    setIntento(true)
    if (invalido || resultado == null) return
    if (onGuardar) {
      onGuardar({ resultado, observacion: observacion.trim() })
      return onClose()
    }
    revisar.mutate(
      { id: s.id as number, resultado, observacion },
      {
        onSuccess: () => {
          notify("Revisión guardada.")
          onClose()
        },
        onError: (e) => setAviso({ id: Date.now(), message: getErrorMessage(e) }),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !revisar.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Revisar soporte — {fila.etiqueta}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="revisar-soporte-archivo">Soporte</FieldLabel>
          <Input
            id="revisar-soporte-archivo"
            variant="outlined"
            readOnly
            value={`${s.archivoNombre} · ${formatearTamano(s.archivoTamano)}`}
          />
        </Field>
        <Field className="gap-1.5" data-invalid={(intento && resultado == null) || undefined}>
          <FieldLabel>
            Resultado<span data-required-mark="">*</span>
          </FieldLabel>
          <RadioGroup
            className="grid gap-1.5"
            value={resultado ?? ""}
            onValueChange={(v) => setResultado(v as Exclude<RevisionSoporte, "SIN_REVISAR">)}
          >
            {(["SOPORTADO", "SOPORTADO_OBSERVACIONES", "NO_SOPORTADO"] as const).map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value={r} />
                {REVISION_SOPORTE[r]}
              </label>
            ))}
          </RadioGroup>
          <FieldDescription>
            Soportado con observaciones cuando los nombres, la fecha de nacimiento o el número no coinciden con la matrícula.
          </FieldDescription>
        </Field>
        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="revisar-soporte-revisado">Revisado por y fecha</FieldLabel>
          <Input
            id="revisar-soporte-revisado"
            variant="outlined"
            readOnly
            value={`${usuario?.name ?? "—"} · ${formatearFecha(hoy)}`}
          />
        </Field>
        <Field variant="outlined" className="gap-1.5" data-invalid={(intento && obsInvalida) || undefined}>
          <FieldLabel htmlFor="observacion-soporte">
            Observación{pideObservacion ? <span data-required-mark="">*</span> : null}
          </FieldLabel>
          <div className="relative">
            <Textarea
              id="observacion-soporte"
              rows={3}
              maxLength={OBS_MAX}
              value={observacion}
              aria-invalid={intento && obsInvalida}
              className={cn(TEXTAREA_OUTLINED, "pr-16")}
              onChange={(e) => setObservacion(e.target.value)}
            />
            <CharacterCounter value={observacion} max={OBS_MAX} className="absolute top-3 right-3" />
          </div>
          <FieldDescription className={cn(intento && obsInvalida && "text-red")}>
            De {OBS_MIN} a {OBS_MAX} caracteres.
          </FieldDescription>
        </Field>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" disabled={revisar.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={revisar.isPending} onClick={guardar}>
            {revisar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <CheckIcon data-icon="inline-start" />}
            Guardar revisión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Reemplazar (EDI.1i, Regla 73): la revisión vuelve a Sin revisar y la anterior queda en la Bitácora.
 * Con `onGuardar` no sube nada: Asignar grupo lo sube a la matrícula nueva al crearla.
 */
export function DialogReemplazarSoporte({
  matriculaId,
  fila,
  onClose,
  onGuardar,
}: DialogSoporteProps & { onGuardar?: (archivo: File) => void }) {
  const s = fila.soporte as Soporte
  const { notify } = useNotify()
  const cargar = useCargarSoporte(matriculaId)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [aviso, setAviso] = useState<Aviso>(null)
  const errorArchivo = archivo ? validarArchivoSoporte(archivo, fila.tipo) : null

  function reemplazar() {
    if (!archivo) {
      setAviso({ id: Date.now(), message: "Seleccione el archivo nuevo." })
      return
    }
    if (errorArchivo) return
    if (onGuardar) {
      onGuardar(archivo)
      return onClose()
    }
    cargar.mutate(
      { tipo: fila.tipo, id: s.id, archivo },
      {
        onSuccess: () => {
          notify(`${fila.etiqueta}: archivo reemplazado.`)
          onClose()
        },
        onError: (e) => setAviso({ id: Date.now(), message: getErrorMessage(e) }),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !cargar.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reemplazar — {fila.etiqueta}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <Field className="gap-1.5" data-invalid={Boolean(errorArchivo) || undefined}>
          <FieldLabel htmlFor="archivo-reemplazo">
            Archivo nuevo<span data-required-mark="">*</span>
          </FieldLabel>
          <input
            id="archivo-reemplazo"
            type="file"
            accept={acceptDe(fila.tipo)}
            className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />
          <FieldDescription className={cn(errorArchivo && "text-red")}>
            {errorArchivo ?? (fila.tipo === "FOTO" ? "JPG, PNG o SVG · máx. 2 MB." : "PDF, JPG o PNG · máx. 10 MB.")}
          </FieldDescription>
        </Field>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        {s.revision !== "SIN_REVISAR" ? (
          <p role="status" className="rounded-md border border-yellow-stroke bg-yellow-22 px-4 py-3 text-sm">
            Este soporte está {REVISION_SOPORTE[s.revision]}. Al reemplazar el archivo volverá a Sin revisar; la revisión
            anterior ({s.revisadoPor}, {formatearFecha(s.revisadoAt)}){s.observacion ? " y su observación" : ""} quedan en la
            Bitácora.
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" disabled={cargar.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={cargar.isPending} onClick={reemplazar}>
            {cargar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <UploadSimpleIcon data-icon="inline-start" />}
            Reemplazar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Quitar (EDI.1j, patrón P.4): solo los de Otros documentos relevantes. */
function DialogQuitarSoporte({ matriculaId, fila, onClose }: { matriculaId: string; fila: FilaSoporte; onClose: () => void }) {
  const s = fila.soporte as Soporte
  const { notify } = useNotify()
  const quitar = useQuitarSoporte(matriculaId)
  const [aviso, setAviso] = useState<Aviso>(null)
  return (
    <Dialog open onOpenChange={(o) => !o && !quitar.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quitar {s.archivoNombre}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <p className="text-sm">
          Se quitará el documento {s.archivoNombre} de «Otros documentos relevantes». Quedará registrado en la Bitácora.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" disabled={quitar.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="destructive"
            size="sm"
            disabled={quitar.isPending}
            onClick={() =>
              quitar.mutate(s.id as number, {
                onSuccess: () => {
                  notify(`${s.archivoNombre} quitado.`)
                  onClose()
                },
                onError: (e) => setAviso({ id: Date.now(), message: getErrorMessage(e) }),
              })
            }
          >
            {quitar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <TrashIcon data-icon="inline-start" />}
            Quitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Documentos requeridos del convenio (EDI.1g, Sección 2.16.1): no bloquean la matrícula. */
function DocumentosConvenio({ matriculaId, editable }: { matriculaId: string; editable: boolean }) {
  const { notify } = useNotify()
  const { data: documentos = [] } = useDocumentosConvenioQuery(matriculaId)
  const marcar = useMarcarDocumentoConvenio(matriculaId)
  if (documentos.length === 0) return null
  const pendientes = documentos.filter((d) => !d.entregado).length
  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold">Documentos requeridos del convenio</h4>
        {pendientes > 0 ? (
          <Badge variant="soft" color="warning" className="rounded-full text-xs tracking-normal">
            {pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}
          </Badge>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Documento requerido</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Marcar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentos.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{d.nombre}</TableCell>
              <TableCell>
                <Badge variant="outline" color={d.entregado ? "success" : "warning"} className="rounded-full text-xs tracking-normal">
                  {d.entregado ? "Entregado" : "Pendiente"}
                </Badge>
              </TableCell>
              <TableCell>
                <Switch
                  round
                  aria-label={`${d.nombre} entregado`}
                  checked={d.entregado}
                  disabled={!editable || marcar.isPending}
                  onCheckedChange={(entregado) =>
                    marcar.mutate(
                      { id: d.id, entregado },
                      { onError: (e) => notify(getErrorMessage(e), { variant: "error" }) },
                    )
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
