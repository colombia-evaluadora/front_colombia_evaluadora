import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InfoIcon, PaperPlaneTiltIcon, XIcon } from "@/components/ui/icons"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import type { AnotacionRow } from "@/features/gestion-estudiantil/observador/api/types"

const MAX_OBSERVADO = 500

/**
 * Provisional: el backend aún no publica el catálogo de tipos de señal (Sección 9.6). Al existir,
 * se reemplaza por `useCatalogo("<CATEGORIA>")` y el valor pasa a ser el id del catálogo.
 */
const TIPOS_SENAL: Opcion[] = [
  { value: "IDEACION_SUICIDA", label: "Ideación suicida" },
  { value: "AUTOLESION", label: "Autolesión" },
  { value: "CONSUMO_SUSTANCIAS", label: "Consumo de sustancias psicoactivas" },
  { value: "OTRA", label: "Otra señal de riesgo" },
]

interface Valores {
  fecha: Date | undefined
  tipo: string
  observado: string
}

type Errores = Partial<Record<keyof Valores, string>>

const vacio = (): Valores => ({ fecha: new Date(), tipo: "", observado: "" })

function validar(v: Valores): Errores {
  const e: Errores = {}
  if (!v.fecha) e.fecha = "Indique la fecha."
  else if (v.fecha > new Date()) e.fecha = "La fecha no puede ser posterior a hoy."
  if (!v.tipo) e.tipo = "Elija el tipo de señal."
  if (!v.observado.trim()) e.observado = "Describa lo observado."
  return e
}

interface Props {
  anotacion: AnotacionRow | null
  onClose: () => void
}

/**
 * «Reportar salud mental» desde una anotación (guía de diseño, DCU Observador; Sección 9.6). El
 * reporte no sale en el Observador, el boletín ni el portal: lo ve el profesional de orientación.
 *
 * Solo vista: el backend todavía no expone el servicio ni el catálogo de tipos de señal, así que
 * «Enviar reporte» valida y avisa que el servicio no está disponible. Al existir, se conecta con una
 * mutación en `api/mutations/`.
 */
export function DialogReportarSaludMental({ anotacion, onClose }: Props) {
  const [v, setV] = useState<Valores>(vacio)
  const [errores, setErrores] = useState<Errores>({})
  const [notice, setNotice] = useState<Notice | null>(null)

  const cambiar = <K extends keyof Valores>(campo: K, valor: Valores[K]) => {
    setV((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: undefined }))
  }

  function cerrar() {
    setV(vacio())
    setErrores({})
    setNotice(null)
    onClose()
  }

  function enviar() {
    const e = validar(v)
    setErrores(e)
    if (Object.keys(e).length) return
    setNotice({
      id: Date.now(),
      message: "Todavía no está disponible el servicio para enviar el reporte de salud mental.",
    })
  }

  return (
    <Dialog open={anotacion != null} onOpenChange={(open) => !open && cerrar()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Reportar salud mental — {anotacion?.estudiante_nombre}</DialogTitle>
        </DialogHeader>

        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="warning" />

        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          <Field variant="outlined" className="gap-2" data-invalid={Boolean(errores.fecha) || undefined}>
            <FieldLabel htmlFor="salud-fecha">Fecha*</FieldLabel>
            <DatePicker
              id="salud-fecha"
              value={v.fecha}
              onChange={(d) => cambiar("fecha", d)}
              maxDate={new Date()}
              aria-invalid={Boolean(errores.fecha) || undefined}
            />
            {errores.fecha && <FieldError>{errores.fecha}</FieldError>}
          </Field>

          <ComboOpciones
            id="salud-tipo"
            label="Tipo de señal"
            required
            todos={false}
            placeholder="Seleccione"
            value={v.tipo}
            options={TIPOS_SENAL}
            onChange={(x) => cambiar("tipo", x)}
            error={errores.tipo}
          />

          <Field
            variant="outlined"
            className="gap-2 sm:col-span-2"
            data-invalid={Boolean(errores.observado) || undefined}
          >
            <FieldLabel htmlFor="salud-observado">Lo observado*</FieldLabel>
            <Textarea
              id="salud-observado"
              rows={3}
              className={TEXTAREA_OUTLINED}
              maxLength={MAX_OBSERVADO}
              placeholder="Qué vio u oyó, cuándo y dónde"
              value={v.observado}
              aria-invalid={Boolean(errores.observado) || undefined}
              onChange={(e) => cambiar("observado", e.target.value)}
            />
            <div className="flex justify-between gap-2">
              {errores.observado ? (
                <FieldError>{errores.observado}</FieldError>
              ) : (
                <FieldDescription>Describa solo lo que vio u oyó, sin diagnósticos.</FieldDescription>
              )}
              <CharacterCounter value={v.observado} max={MAX_OBSERVADO} />
            </div>
          </Field>
        </div>

        <Alert variant="info">
          <InfoIcon aria-hidden="true" />
          <AlertDescription>
            Este reporte no sale en el Observador, en el boletín ni en el portal del acudiente. Lo verá el
            Profesional de orientación.
          </AlertDescription>
        </Alert>

        <DialogFooter className="sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
          <Button size="sm" type="button" onClick={enviar}>
            <PaperPlaneTiltIcon data-icon="inline-start" />
            Enviar reporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
