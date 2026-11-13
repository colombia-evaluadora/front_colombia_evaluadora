import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { CharacterCounter } from "@/components/ui/character-counter"
import { DatePicker } from "@/components/date-picker"
import { PersonRemoveIcon, SpinnerIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { cn } from "@/lib/utils"

import { usePreviaRetiroQuery, useRetirarLote } from "@/features/coverage/matricula/api/acciones-lote"
import { useMatriculaCatalogQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import {
  Aviso,
  BadgeComplementaria,
  CampoSelect,
  MatriculasAfectadas,
  mensajeLote,
  nombreDe,
  plural,
  tituloAccion,
} from "@/features/coverage/matricula/components/dialogs/acciones/compartido"
import { BotonAccion } from "@/features/coverage/matricula/components/dialogs/acciones/boton-accion"

const OBSERVACION_MAX = 500

/** Quién originó el retiro: sale en el acta de retiro para el SIMPADE. */
const MOTIVOS_NOVEDAD = [
  "Solicitud del acudiente o del estudiante mayor de edad",
  "Decisión del establecimiento",
  "Traslado reportado por otro establecimiento",
  "Fallecimiento",
].map((m) => ({ value: m, label: m }))

/** Retirar (C.1.LOT.1): la misma acción para una matrícula (fila, detalle) o varias (barra de lote). */
export function DialogRetirar({
  matriculas,
  onOpenChange,
  onDone,
}: {
  matriculas: Matricula[]
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const { notify } = useNotify()
  const ids = matriculas.map((m) => m.id)
  const { data: previa } = usePreviaRetiroQuery(ids)
  const { data: motivos = [] } = useMatriculaCatalogQuery("motivoRetiro")
  const retirar = useRetirarLote()
  const [fecha, setFecha] = useState(formatDateValue(new Date()))
  const [motivoRetiro, setMotivoRetiro] = useState("")
  const [motivoNovedad, setMotivoNovedad] = useState("")
  const [observacion, setObservacion] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)

  const uno = matriculas.length === 1
  const conComplementaria = (previa ?? []).filter((p) => p.complementaria)
  const hoy = new Date()
  const fechaValida = Boolean(fecha) && (parseDateValue(fecha) ?? hoy) <= hoy

  function confirmar() {
    setIntentado(true)
    if (!fechaValida || !motivoRetiro || !motivoNovedad) return
    retirar.mutate(
      { matriculaIds: ids, fecha, motivoRetiroId: Number(motivoRetiro), motivoNovedad, observacion: observacion.trim() },
      {
        onSuccess: (resultados) => {
          const { variant, texto } = mensajeLote(resultados, (n) =>
            uno && n === 1 ? `${nombreDe(matriculas[0])} quedó Retirado.` : `${plural(n, "matrícula quedó", "matrículas quedaron")} en Retirado.`,
          )
          notify(texto, { variant })
          onDone?.()
          onOpenChange(false)
        },
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !retirar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{tituloAccion("Retirar", matriculas)}</DialogTitle>
          <MatriculasAfectadas matriculas={matriculas} />
          {uno && conComplementaria.length ? <BadgeComplementaria /> : null}
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field variant="outlined" className="gap-1.5" data-invalid={(intentado && !fechaValida) || undefined}>
            <FieldLabel htmlFor="retiro-fecha">
              Fecha de retiro<span data-required-mark="">*</span>
            </FieldLabel>
            <DatePicker
              id="retiro-fecha"
              mode="date"
              size="sm"
              variant="outlined"
              value={parseDateValue(fecha)}
              maxDate={hoy}
              aria-invalid={intentado && !fechaValida}
              onChange={(d) => setFecha(formatDateValue(d))}
            />
            <FieldDescription className={cn(intentado && !fechaValida && "text-red")}>No admite fechas futuras.</FieldDescription>
          </Field>
          <CampoSelect
            id="retiro-motivo"
            label="Motivo de retiro"
            required
            value={motivoRetiro}
            onChange={setMotivoRetiro}
            opciones={motivos.map((m) => ({ value: String(m.id), label: m.nombre }))}
            invalido={intentado && !motivoRetiro}
            descripcion={intentado && !motivoRetiro ? "Elija el motivo de retiro." : undefined}
          />
        </div>

        <CampoSelect
          id="retiro-novedad"
          label="Motivo de la novedad"
          required
          value={motivoNovedad}
          onChange={setMotivoNovedad}
          opciones={MOTIVOS_NOVEDAD}
          invalido={intentado && !motivoNovedad}
          descripcion="Quién originó el retiro. Sale en el acta de retiro para el SIMPADE."
        />

        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="retiro-observacion">Observación</FieldLabel>
          <div className="relative">
            <Textarea
              id="retiro-observacion"
              rows={2}
              maxLength={OBSERVACION_MAX}
              value={observacion}
              placeholder="Opcional"
              className={cn(TEXTAREA_OUTLINED, "pr-16")}
              onChange={(e) => setObservacion(e.target.value)}
            />
            <CharacterCounter value={observacion} max={OBSERVACION_MAX} className="absolute top-3 right-3" />
          </div>
        </Field>

        <Aviso
          tono="advertencia"
          titulo={uno ? "La matrícula pasará a Retirado." : `Las ${matriculas.length} matrículas pasarán a Retirado.`}
        >
          {conComplementaria.length
            ? uno
              ? (() => {
                  const c = conComplementaria[0].complementaria
                  return c ? `Su matrícula complementaria (${c.sede} · ${c.jornada} · ${c.especialidad}) también pasará a Retirado.` : null
                })()
              : `${plural(conComplementaria.length, "estudiante tiene", "estudiantes tienen")} matrícula complementaria: también pasará a Retirado.`
            : null}
        </Aviso>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="destructive" size="sm" disabled={retirar.isPending} onClick={confirmar}>
            {retirar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <PersonRemoveIcon data-icon="inline-start" />
            )}
            Retirar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface RetirarMatriculaDialogProps {
  matricula: Matricula
  /** "icon" (fila de la tabla) o "button" (barra de detalle/edición). */
  trigger?: "icon" | "button"
}

export function RetirarMatriculaDialog({ matricula, trigger = "icon" }: RetirarMatriculaDialogProps) {
  const [open, setOpen] = useState(false)
  // Solo se retira una matrícula Cursando.
  if (matricula.status !== "Cursando") return null
  return (
    <>
      <BotonAccion
        modo={trigger}
        label="Retirar"
        ariaLabel={`Retirar a ${nombreDe(matricula)}`}
        Icon={PersonRemoveIcon}
        onClick={() => setOpen(true)}
      />
      {open ? <DialogRetirar matriculas={[matricula]} onOpenChange={setOpen} /> : null}
    </>
  )
}
