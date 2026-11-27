import { useRef, useState, type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { CheckIcon, EyeIcon, FileDownloadOutlinedIcon, FolderOpenIcon, LockIcon, PaperclipIcon, PlusIcon, SpinnerIcon, TrashIcon, UploadSimpleIcon, XIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { useUser } from "@/lib/auth"
import { Input } from "@/components/ui/input"
import { FichaDatos } from "@/components/ficha-datos"
import { MarcoOpciones } from "@/components/marco-opciones"
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
import { ACTIONS_BUTTON_HOVER_CLASS } from "@/components/table-row-actions"
import { isFieldRequired, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"

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
  /** Configuración de campos del establecimiento: marca con * los soportes obligatorios. */
  fieldSettings?: MatriculaFieldSettingsMap
}

/** Soporte → campo de la configuración (bloque «Archivo de soporte»); la hoja firmada no se configura. */
const CAMPO_SOPORTE: Partial<Record<TipoSoporte, string>> = {
  FOTO: "file-student-photo",
  DOCUMENTO_IDENTIDAD: "file-student-id-document",
  CERTIFICADO_ESTUDIOS: "file-previous-year-certificate",
  CERTIFICADO_MEDICO: "file-medical-certificate",
}
const esObligatorio = (tipo: TipoSoporte, settings?: MatriculaFieldSettingsMap) =>
  Boolean(settings && CAMPO_SOPORTE[tipo] && isFieldRequired(settings, CAMPO_SOPORTE[tipo]))

/**
 * Bloque 14 (informe 2.14, Reglas 6, 23 y 73): una fila por soporte con su
 * revisión. Cada operación se guarda al momento, no con el botón Guardar de la
 * matrícula; la revisión nunca impide la matrícula.
 */
const nombreFila = (fila: FilaSoporte) => (fila.sub ? `${fila.etiqueta}, ${fila.sub}` : fila.etiqueta)

/** Acción de un soporte como ícono suelto con tooltip (CLAUDE.md §13: hasta 6 íconos, sin ⁞). */
function AccionSoporte({
  label,
  tooltip,
  disabled,
  destructivo,
  onClick,
  children,
}: {
  label: string
  tooltip: string
  disabled?: boolean
  destructivo?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color={destructivo ? "destructive" : "neutral"}
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

export function MatriculaSoportesSection({ matriculaId, editable, porAdscripcion = false, fieldSettings }: SoportesSectionProps) {
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
          // Lista como la referencia de diseño: nombre (con * si es obligatorio), debajo carpeta con el archivo o
          // «Sin datos», separador y formatos admitidos; a la derecha el clip para adjuntar o las acciones.
          <ul className="flex flex-col">
            {filas.map((fila) => {
              const s = fila.soporte
              const cargado = s?.archivoId != null
              const obligatorio = esObligatorio(fila.tipo, fieldSettings)
              return (
                <li key={fila.key} className="flex items-center gap-4 border-b border-border py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {fila.etiqueta}
                      {obligatorio ? <span data-required-mark="">*</span> : null}
                      {fila.sub ? <span className="ml-2 text-xs font-normal text-muted-foreground">{fila.sub}</span> : null}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <FolderOpenIcon aria-hidden className="size-4 shrink-0" />
                        <span className={cn("truncate", cargado && "text-foreground")}>
                          {cargado ? `${s.archivoNombre} · ${formatearTamano(s.archivoTamano)}` : "Sin datos"}
                        </span>
                      </span>
                      <span aria-hidden className="h-4 w-px bg-border" />
                      <span>{fila.tipo === "FOTO" ? "JPG, PNG o SVG · máximo 2 MB" : "PDF, JPG o PNG · máximo 10 MB"}</span>
                      {cargado ? (
                        <>
                          <span aria-hidden className="h-4 w-px bg-border" />
                          <RevisionBadge revision={s.revision} />
                          {s.revisadoPor ? <span>{`${s.revisadoPor} · ${formatearFecha(s.revisadoAt)}`}</span> : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                  {/* Hasta 4 acciones: íconos sueltos con tooltip, no un menú ⁞ (CLAUDE.md §13). */}
                  {/* Hover de botón ícono igual que en las tablas: azul claro, y rojo en Quitar (CLAUDE.md §13). */}
                  <div className={cn("flex shrink-0 items-center gap-1", ACTIONS_BUTTON_HOVER_CLASS)}>
                    {!cargado ? (
                      editable ? (
                        <AccionSoporte
                          label={`Adjuntar archivo a ${nombreFila(fila)}`}
                          tooltip="Adjuntar archivo"
                          disabled={cargar.isPending}
                          onClick={() => elegirArchivo(fila.tipo, null)}
                        >
                          <PaperclipIcon />
                        </AccionSoporte>
                      ) : null
                    ) : (
                      <>
                        <AccionSoporte label={`Ver archivo de ${nombreFila(fila)}`} tooltip="Ver archivo" onClick={() => setViendo(fila)}>
                          <EyeIcon />
                        </AccionSoporte>
                        {editable ? (
                          <>
                            <AccionSoporte
                              label={`Reemplazar ${nombreFila(fila)}`}
                              tooltip="Reemplazar"
                              onClick={() => setReemplazando(fila)}
                            >
                              <UploadSimpleIcon />
                            </AccionSoporte>
                            <AccionSoporte
                              label={`Revisar soporte ${nombreFila(fila)}`}
                              tooltip="Revisar soporte"
                              onClick={() => setRevisando(fila)}
                            >
                              <CheckIcon />
                            </AccionSoporte>
                            {fila.tipo === "OTRO" ? (
                              <AccionSoporte
                                label={`Quitar ${nombreFila(fila)}`}
                                tooltip="Quitar"
                                destructivo
                                onClick={() => setQuitando(fila)}
                              >
                                <TrashIcon />
                              </AccionSoporte>
                            ) : null}
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
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

/** Ver archivo (EDI.1h): vista previa y, debajo, la ficha con la revisión vigente; la reusa la ficha de una reserva (Asignar grupo). */
export function DialogVerSoporte({ fila, onClose }: { fila: FilaSoporte; onClose: () => void }) {
  const s = fila.soporte as Soporte
  const { data: url, isPending } = useArchivoViewUrl(s.archivoId)
  const esPdf = (s.archivoNombre ?? "").toLowerCase().endsWith(".pdf")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{fila.sub ? `${fila.etiqueta} · ${fila.sub}` : fila.etiqueta}</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-80 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
          {isPending || !url ? (
            <SpinnerIcon className="animate-spin text-muted-foreground" aria-label="Cargando vista previa" />
          ) : esPdf ? (
            <iframe src={url} title={`Vista previa de ${s.archivoNombre}`} className="h-[28rem] w-full" />
          ) : (
            <img src={url} alt={`Vista previa de ${s.archivoNombre}`} className="max-h-[28rem] object-contain" />
          )}
        </div>
        {/* Datos del soporte en la ficha de solo lectura (§13 «Ver detalle»), bajo la vista previa. */}
        <FichaDatos
          datos={[
            { etiqueta: "Soporte", valor: fila.etiqueta },
            { etiqueta: "Archivo", valor: `${s.archivoNombre} · ${formatearTamano(s.archivoTamano)}` },
            { etiqueta: "Subido por", valor: s.subidoPor ? `${s.subidoPor} · ${formatearFecha(s.subidoAt)}` : "—" },
            { etiqueta: "Revisión", valor: <RevisionBadge revision={s.revision} /> },
            { etiqueta: "Revisado por", valor: s.revisadoPor ? `${s.revisadoPor} · ${formatearFecha(s.revisadoAt)}` : "—" },
            ...(s.observacion ? [{ etiqueta: "Observación", valor: s.observacion, ancho: true }] : []),
          ]}
        />
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={onClose}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={!url}
            nativeButton={false}
            render={<a href={url} download={s.archivoNombre ?? undefined} />}
          >
            <FileDownloadOutlinedIcon data-icon="inline-start" />
            Descargar
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
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Revisar soporte — {fila.etiqueta}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="revisar-soporte-archivo">Soporte</FieldLabel>
          <div className="relative">
            <Input
              id="revisar-soporte-archivo"
              variant="outlined"
              readOnly
              className="pr-9"
              value={`${s.archivoNombre} · ${formatearTamano(s.archivoTamano)}`}
            />
            <LockIcon aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </Field>
        <MarcoOpciones
          id="revisar-soporte-resultado"
          label="Resultado"
          required
          invalido={intento && resultado == null}
          descripcion="Soportado con observaciones cuando los nombres, la fecha de nacimiento o el número no coinciden con la matrícula."
        >
          <RadioGroup
            aria-labelledby="revisar-soporte-resultado-label"
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
        </MarcoOpciones>
        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="revisar-soporte-revisado">Revisado por y fecha</FieldLabel>
          <div className="relative">
            <Input
              id="revisar-soporte-revisado"
              variant="outlined"
              readOnly
              className="pr-9"
              value={`${usuario?.name ?? "—"} · ${formatearFecha(hoy)}`}
            />
            <LockIcon aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
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
        <DialogFooter>
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <Button variant="outline" color="neutral" type="button" size="sm" disabled={revisar.isPending} onClick={onClose}>
            <XIcon data-icon="inline-start" />
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
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Reemplazar — {fila.etiqueta}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        {/* Marco con label flotante como los demás campos (el `Field` sin variante ponía el label en mayúsculas). */}
        <MarcoOpciones
          id="archivo-reemplazo-marco"
          label="Archivo nuevo"
          required
          error={errorArchivo ?? undefined}
          descripcion={fila.tipo === "FOTO" ? "JPG, PNG o SVG · máx. 2 MB." : "PDF, JPG o PNG · máx. 10 MB."}
        >
          <input
            id="archivo-reemplazo"
            type="file"
            aria-labelledby="archivo-reemplazo-marco-label"
            accept={acceptDe(fila.tipo)}
            className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />
        </MarcoOpciones>
        {s.revision !== "SIN_REVISAR" ? (
          <p role="status" className="rounded-md border border-yellow-stroke bg-yellow-22 px-4 py-3 text-sm">
            Este soporte está {REVISION_SOPORTE[s.revision]}. Al reemplazar el archivo volverá a Sin revisar; la revisión
            anterior ({s.revisadoPor}, {formatearFecha(s.revisadoAt)}){s.observacion ? " y su observación" : ""} quedan en la
            Bitácora.
          </p>
        ) : null}
        <DialogFooter>
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <Button variant="outline" color="neutral" type="button" size="sm" disabled={cargar.isPending} onClick={onClose}>
            <XIcon data-icon="inline-start" />
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
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Quitar {s.archivoNombre}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <p className="text-sm">
          Se quitará el documento {s.archivoNombre} de «Otros documentos relevantes». Quedará registrado en la Bitácora.
        </p>
        <DialogFooter>
          <Button variant="outline" color="neutral" type="button" size="sm" disabled={quitar.isPending} onClick={onClose}>
            <XIcon data-icon="inline-start" />
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
