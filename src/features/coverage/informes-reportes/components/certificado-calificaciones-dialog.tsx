import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { MarcoOpciones } from "@/components/marco-opciones"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { FilePdfIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import {
  useGenerarCertificado,
  usePreviaCertificadoQuery,
  type PresentacionCertificado,
} from "@/features/coverage/informes-reportes/api/certificado"

const DIRIGIDA_MIN = 3
const DIRIGIDA_MAX = 150
const PRESENTACIONES: { value: PresentacionCertificado; label: string }[] = [
  { value: "ESCALA", label: "Escala de valoración" },
  { value: "FORMATO", label: "Formato de calificación" },
]

/**
 * Generar certificado de calificaciones de una matrícula de cualquier año (C.4.CER.1/1a).
 * Definitivo: lleva el número de la matrícula (o el siguiente) y QR; volver a generarlo deja el
 * anterior Reemplazado. Borrador: sin número ni QR, no consume número.
 */
export function CertificadoCalificacionesDialog({
  matriculaId,
  resumen,
  onOpenChange,
}: {
  matriculaId: string
  /** «Andrea Lucía Gómez Ruiz · Décimo · 10°A · 2026 · Aprobado» */
  resumen: string
  onOpenChange: (open: boolean) => void
}) {
  const { notify } = useNotify()
  const previa = usePreviaCertificadoQuery(matriculaId)
  const generar = useGenerarCertificado()
  const [presentacion, setPresentacion] = useState<PresentacionCertificado>("ESCALA")
  const [dirigidaA, setDirigidaA] = useState("A quien interese")
  const [fecha, setFecha] = useState<Date | undefined>(new Date())
  const [borrador, setBorrador] = useState(true)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const largo = dirigidaA.trim().length
  const dirigidaValida = largo >= DIRIGIDA_MIN && largo <= DIRIGIDA_MAX
  const valido = dirigidaValida && Boolean(fecha)

  function confirmar() {
    if (!valido) return
    generar.mutate(
      { matriculaId, presentacion, dirigidaA: dirigidaA.trim(), fecha: fecha as Date, borrador },
      {
        onSuccess: () => {
          notify(borrador ? "Se generó el borrador del certificado de calificaciones." : "Se generó el certificado de calificaciones.")
          onOpenChange(false)
        },
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !generar.isPending && onOpenChange(o)}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generar certificado de calificaciones</DialogTitle>
          <DialogDescription>{resumen}</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        <MarcoOpciones
          id="certificado-presentacion"
          label="Presentar las calificaciones con"
          descripcion="El formato de calificación (notas) sirve para homologar estudios."
        >
          <RadioGroup
            value={presentacion}
            onValueChange={(v) => setPresentacion(v as PresentacionCertificado)}
            className="flex flex-wrap gap-x-5 gap-y-2"
          >
            {PRESENTACIONES.map((p) => (
              <label key={p.value} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={p.value} />
                {p.label}
              </label>
            ))}
          </RadioGroup>
        </MarcoOpciones>

        <Field variant="outlined" className="gap-1.5" data-invalid={!dirigidaValida || undefined}>
          <FieldLabel htmlFor="certificado-dirigida">
            Dirigida a<span data-required-mark="">*</span>
          </FieldLabel>
          <Input
            id="certificado-dirigida"
            variant="outlined"
            maxLength={DIRIGIDA_MAX}
            value={dirigidaA}
            aria-invalid={!dirigidaValida}
            onChange={(e) => setDirigidaA(e.target.value)}
          />
          <div className="flex justify-between gap-2">
            <FieldDescription className={cn(!dirigidaValida && "text-red")}>
              {dirigidaValida
                ? "Se puede cambiar; p. ej. el nombre de la entidad que la pide."
                : `Entre ${DIRIGIDA_MIN} y ${DIRIGIDA_MAX} caracteres.`}
            </FieldDescription>
            <span className="text-xs text-muted-foreground tabular-nums">
              {dirigidaA.length} / {DIRIGIDA_MAX}
            </span>
          </div>
        </Field>

        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="certificado-fecha">
            Fecha de expedición<span data-required-mark="">*</span>
          </FieldLabel>
          <DatePicker id="certificado-fecha" value={fecha} onChange={setFecha} maxDate={new Date()} />
        </Field>

        <MarcoOpciones
          id="certificado-borrador"
          label="Generar como borrador"
          descripcion={
            borrador
              ? "Como borrador no se asigna número y el documento sale con la marca BORRADOR, sin código QR."
              : previa.data?.numero
                ? `Se asignará el Certificado n.º ${previa.data.numero} y el documento quedará emitido, con su código QR.`
                : "Se asignará el número del certificado y el documento quedará emitido, con su código QR."
          }
        >
          <RadioGroup
            value={borrador ? "S" : "N"}
            onValueChange={(v) => setBorrador(v === "S")}
            className="flex gap-x-5"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="S" />
              Sí
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="N" />
              No
            </label>
          </RadioGroup>
        </MarcoOpciones>

        <DialogFooter className="items-center">
          <span className="mr-auto text-xs text-muted-foreground">Los campos marcados con * son obligatorios</span>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={!valido || generar.isPending} onClick={confirmar}>
            {generar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FilePdfIcon data-icon="inline-start" />}
            Generar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
