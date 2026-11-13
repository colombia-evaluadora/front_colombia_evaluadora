import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import {
  GitMergeIcon,
  InfoIcon,
  PaperclipIcon,
  SpinnerIcon,
  UploadSimpleIcon,
  XCircleIcon,
  XIcon,
} from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import {
  useBuscarEstudiantesQuery,
  type EstudianteUnificable,
} from "@/features/coverage/matricula/api/query/use-buscar-estudiantes"
import { useUnificarEstudiantes } from "@/features/coverage/matricula/api/mutations/unificar-estudiantes"

const SOPORTE_EXTENSIONES = ["pdf", "jpg", "jpeg", "png"]
const SOPORTE_MAX_MB = 10
const MOTIVO_MIN = 10
const MOTIVO_MAX = 500

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Documento del estudiante de la fila: se busca y queda como el que se conserva. */
  documentoInicial: string
  onUnified: (mensaje: string) => void
}

/** «a», «a y b», «a, b y c». */
const enumerar = (partes: string[]) =>
  partes.length <= 1 ? (partes[0] ?? "") : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`

const plural = (n: number, singular: string, varios: string) => `${n} ${n === 1 ? singular : varios}`

/**
 * Lo que dice el aviso antes de unificar: qué pasa al registro que se conserva y,
 * si los dos tienen matrícula en establecimientos distintos, a quién se avisa.
 */
function resumen(conserva: EstudianteUnificable, duplicado: EstudianteUnificable) {
  const movidos = [
    duplicado.matriculas > 0 ? plural(duplicado.matriculas, "matrícula", "matrículas") : null,
    duplicado.reservas > 0 ? plural(duplicado.reservas, "reserva", "reservas") : null,
    "el historial",
  ].filter((p): p is string => p != null)
  const establecimientos = [...new Set([...conserva.establecimientos, ...duplicado.establecimientos])]
  const cierre =
    establecimientos.length > 1
      ? `Se avisará a ${enumerar(establecimientos.map((e, i) => (i === 0 ? e : `a ${e}`)))}.`
      : `El duplicado queda «Unificado en ${conserva.documento}» y no se elimina.`
  return `Pasarán al registro que se conserva: ${enumerar(movidos)}. ${cierre}`
}

/**
 * Unificar estudiantes (Regla 72): une dos registros de la misma persona que
 * quedaron con documentos distintos. El duplicado no se borra: queda
 * «Unificado en [documento]» y lo suyo pasa al que se conserva.
 */
export function DialogUnificarEstudiantes({ open, onOpenChange, documentoInicial, onUnified }: Props) {
  const [conserva, setConserva] = useState<EstudianteUnificable | null>(null)
  const [duplicado, setDuplicado] = useState<EstudianteUnificable | null>(null)
  const [motivo, setMotivo] = useState("")
  const [soporte, setSoporte] = useState<File | null>(null)
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const unificar = useUnificarEstudiantes()

  const motivoValido = motivo.trim().length >= MOTIVO_MIN && motivo.trim().length <= MOTIVO_MAX
  // Regla 72: con los dos Cursando en el mismo período se bloquea hasta retirar o anular una.
  const ambosCursando =
    conserva?.cursando != null && duplicado?.cursando != null && conserva.cursando.periodoId === duplicado.cursando.periodoId

  function elegirSoporte(file: File | undefined) {
    if (!file) return
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!SOPORTE_EXTENSIONES.includes(ext)) {
      setError({ id: Date.now(), message: "El soporte debe ser un archivo PDF, JPG o PNG." })
      return
    }
    if (file.size > SOPORTE_MAX_MB * 1024 * 1024) {
      setError({ id: Date.now(), message: `El soporte supera los ${SOPORTE_MAX_MB} MB.` })
      return
    }
    setSoporte(file)
  }

  function guardar() {
    setIntentado(true)
    if (!conserva || !duplicado || ambosCursando || !motivoValido || !soporte) return
    unificar.mutate(
      { conservaId: conserva.id, duplicadoId: duplicado.id, motivo, soporte },
      {
        onSuccess: () => onUnified(`${duplicado.nombre} quedó unificado en ${conserva.documento}.`),
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !unificar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Unificar estudiantes</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectorEstudiante
            id="unificar-conserva"
            label="Estudiante que se conserva"
            ayuda="El registro correcto."
            valor={conserva}
            onChange={setConserva}
            textoInicial={documentoInicial}
            excluirId={duplicado?.id}
            invalido={intentado && !conserva}
          />
          <SelectorEstudiante
            id="unificar-duplicado"
            label="Estudiante duplicado"
            ayuda="Distinto del anterior."
            valor={duplicado}
            onChange={setDuplicado}
            excluirId={conserva?.id}
            invalido={intentado && !duplicado}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="unificar-motivo" className="text-sm">
            <span className="text-red">*</span> Motivo
          </label>
          <Textarea
            id="unificar-motivo"
            rows={3}
            maxLength={MOTIVO_MAX}
            value={motivo}
            placeholder="Explique por qué son la misma persona"
            aria-invalid={intentado && !motivoValido}
            aria-describedby="unificar-motivo-ayuda"
            className="min-h-20 resize-y rounded-md border border-input px-3 py-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-red"
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div id="unificar-motivo-ayuda" className="flex justify-between text-sm text-muted-foreground">
            <span className={cn(intentado && !motivoValido && "text-red")}>
              De {MOTIVO_MIN} a {MOTIVO_MAX} caracteres.
            </span>
            <span className="tabular-nums">
              {motivo.length} / {MOTIVO_MAX}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1.5">
          <span id="unificar-soporte-label" className="text-sm">
            <span className="text-red">*</span> Soporte
          </span>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            aria-labelledby="unificar-soporte-label"
            onChange={(e) => {
              elegirSoporte(e.target.files?.[0])
              e.target.value = ""
            }}
          />
          <Button
            type="button"
            variant="outline"
            color={intentado && !soporte ? "destructive" : "neutral"}
            size="sm"
            onClick={() => fileInput.current?.click()}
          >
            <UploadSimpleIcon data-icon="inline-start" />
            Subir PDF, JPG o PNG
          </Button>
          {soporte ? (
            <span className="inline-flex items-center gap-2 text-sm">
              <PaperclipIcon className="size-4 text-muted-foreground" aria-hidden />
              {soporte.name}
              <button
                type="button"
                aria-label={`Quitar ${soporte.name}`}
                className="rounded-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                onClick={() => setSoporte(null)}
              >
                <XIcon className="size-4" />
              </button>
            </span>
          ) : null}
          <span className={cn("text-sm text-muted-foreground", intentado && !soporte && "text-red")}>
            PDF, JPG o PNG · máx. {SOPORTE_MAX_MB} MB.
          </span>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

        {conserva && duplicado ? (
          ambosCursando ? (
            <div role="alert" className="flex gap-3 rounded-md border border-red-stroke bg-red-22 px-4 py-3 text-sm">
              <XCircleIcon className="mt-0.5 size-4 shrink-0 text-red" aria-hidden />
              <p>
                Los dos tienen matrícula Cursando en el mismo período (
                {[conserva.cursando?.periodo, conserva.cursando?.establecimiento, conserva.cursando?.grupo]
                  .filter(Boolean)
                  .join(" · ")}
                ). Retire o anule una antes de unificar.
              </p>
            </div>
          ) : (
            <div role="status" className="flex gap-3 rounded-md border border-primary/30 bg-primary-22 px-4 py-3 text-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p>{resumen(conserva, duplicado)}</p>
            </div>
          )
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={unificar.isPending || ambosCursando}
            onClick={guardar}
          >
            {unificar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <GitMergeIcon data-icon="inline-start" />
            )}
            Unificar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface SelectorProps {
  id: string
  label: string
  ayuda: string
  valor: EstudianteUnificable | null
  onChange: (estudiante: EstudianteUnificable | null) => void
  /** Se busca al abrir y, si hay un registro con ese documento, queda elegido. */
  textoInicial?: string
  excluirId?: number
  invalido: boolean
}

const etiqueta = (e: EstudianteUnificable) =>
  [e.nombre, `${e.tipoDocumento} ${e.documento}`, e.establecimientos[0]].filter(Boolean).join(" · ")

/** Selector de estudiante con búsqueda en el back por documento o nombre. */
function SelectorEstudiante({ id, label, ayuda, valor, onChange, textoInicial = "", excluirId, invalido }: SelectorProps) {
  const [texto, setTexto] = useState(textoInicial)
  const [autoElegido, setAutoElegido] = useState(textoInicial === "")
  const { data: resultados = [], isFetching } = useBuscarEstudiantesQuery(texto)

  // Primera búsqueda con el documento de la fila: se elige sola. Efecto (y no
  // ajuste en render) porque actualiza el estado del padre.
  const exacto = !autoElegido && !valor ? resultados.find((e) => e.documento === textoInicial) : undefined
  useEffect(() => {
    if (!exacto) return
    setAutoElegido(true)
    onChange(exacto)
  }, [exacto, onChange])

  // El elegido se mantiene en las opciones aunque la búsqueda actual no lo traiga.
  const opciones = [...(valor ? [valor] : []), ...resultados.filter((e) => e.id !== valor?.id)].filter(
    (e) => e.id !== excluirId,
  )
  const porId = new Map(opciones.map((e) => [String(e.id), e]))
  const items = Object.fromEntries(opciones.map((e) => [String(e.id), etiqueta(e)]))

  return (
    <Field variant="outlined" className="min-w-0 gap-1.5" data-invalid={invalido || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        <span data-required-mark="">*</span>
      </FieldLabel>
      <ComboboxField
        items={items}
        value={valor ? String(valor.id) : ""}
        onValueChange={(next) => {
          setAutoElegido(true)
          onChange(next ? (porId.get(String(next)) ?? null) : null)
        }}
        onInputValueChange={(value, details) => {
          if (details.reason === "input-change" || details.reason === "input-clear") {
            setAutoElegido(true)
            setTexto(value)
          }
        }}
      >
        <ComboboxFieldTrigger id={id} size="sm" variant="outlined" className="w-full" aria-invalid={invalido}>
          <ComboboxFieldValue placeholder="Buscar por documento o nombre" />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {opciones.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {isFetching ? "Buscando…" : "Escriba al menos 3 caracteres del documento o el nombre."}
            </p>
          ) : (
            opciones.map((e) => (
              <ComboboxFieldItem key={e.id} value={String(e.id)} title={etiqueta(e)}>
                {etiqueta(e)}
              </ComboboxFieldItem>
            ))
          )}
        </ComboboxFieldContent>
      </ComboboxField>
      <FieldDescription className={cn(invalido && "text-red")}>{ayuda}</FieldDescription>
    </Field>
  )
}
