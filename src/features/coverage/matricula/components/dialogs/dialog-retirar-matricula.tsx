import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { CharacterCounter } from "@/components/ui/character-counter"
import { DatePicker } from "@/components/date-picker"
import { PaperclipIcon, PersonRemoveIcon, SpinnerIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { cn } from "@/lib/utils"

import { usePreviaRetiroQuery, useRetirarLote } from "@/features/coverage/matricula/api/acciones-lote"
import { useResponderSolicitudRetiro } from "@/features/coverage/matricula/api/solicitud-retiro"
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
const OBSERVACION_MIN = 10
const MOTIVO_TRASLADO = "Traslado a otro establecimiento"
const NOVEDAD_INICIAL = "Solicitud del acudiente o del estudiante mayor de edad"
const NOVEDAD_REQUERIMIENTO = "Requerimiento de otra entidad territorial o establecimiento"
/** Regla 74: el aviso de 30 días sin asistir abre Retirar con esta novedad. */
export const NOVEDAD_INASISTENCIA = "Inasistencia continua de más de 30 días calendario sin justificación válida"
const DESTINO_MIN = 3
const DESTINO_MAX = 150

/** Quién originó el retiro: sale en el acta de retiro para el SIMPADE. */
const MOTIVOS_NOVEDAD = [
  NOVEDAD_INICIAL,
  "Decisión del establecimiento",
  NOVEDAD_REQUERIMIENTO,
  "Fallecimiento",
  NOVEDAD_INASISTENCIA,
].map((m) => ({ value: m, label: m }))

/** Retiro pedido por otro establecimiento (SOL.6): motivos fijos y sin destino. */
export interface RetiroPorSolicitud {
  establecimiento: string
  evidenciaNombre: string
  onRetirado: (mensaje: string) => void
}

/** Retirar (C.1.LOT.1): la misma acción para una matrícula (fila, detalle) o varias (barra de lote). */
export function DialogRetirar({
  matriculas,
  onOpenChange,
  onDone,
  porSolicitud,
  novedadInicial,
}: {
  matriculas: Matricula[]
  onOpenChange: (open: boolean) => void
  onDone?: () => void
  porSolicitud?: RetiroPorSolicitud
  novedadInicial?: string
}) {
  const { notify } = useNotify()
  const ids = matriculas.map((m) => m.id)
  const { data: previa } = usePreviaRetiroQuery(ids)
  const { data: motivos = [] } = useMatriculaCatalogQuery("motivoRetiro")
  const retirar = useRetirarLote()
  const responder = useResponderSolicitudRetiro()
  const pendiente = retirar.isPending || responder.isPending
  const [fecha, setFecha] = useState(formatDateValue(new Date()))
  const [motivoRetiro, setMotivoRetiro] = useState("")
  const [motivoNovedad, setMotivoNovedad] = useState(porSolicitud ? NOVEDAD_REQUERIMIENTO : (novedadInicial ?? NOVEDAD_INICIAL))
  const [observacion, setObservacion] = useState("")
  const [institucionDestino, setInstitucionDestino] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)

  const uno = matriculas.length === 1
  const conComplementaria = (previa ?? []).filter((p) => p.complementaria)
  const hoy = new Date()
  const esTraslado = motivos.find((m) => String(m.id) === motivoRetiro)?.nombre === MOTIVO_TRASLADO
  const fechaValida = Boolean(fecha) && (parseDateValue(fecha) ?? hoy) <= hoy
  const destino = institucionDestino.trim()
  const destinoValido = !esTraslado || !destino || (destino.length >= DESTINO_MIN && destino.length <= DESTINO_MAX)

  const observacionValida = !observacion.trim() || observacion.trim().length >= OBSERVACION_MIN

  function confirmar() {
    setIntentado(true)
    if (porSolicitud) {
      if (!fechaValida || !observacionValida) return
      responder.mutate(
        { matriculaId: ids[0], accion: "retirar", fecha, observacion: observacion.trim() },
        {
          onSuccess: () => porSolicitud.onRetirado(`${nombreDe(matriculas[0])} quedó Retirado.`),
          onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
        },
      )
      return
    }
    if (!fechaValida || !motivoRetiro || !motivoNovedad || !destinoValido || !observacionValida) return
    retirar.mutate(
      {
        matriculaIds: ids,
        fecha,
        motivoRetiroId: Number(motivoRetiro),
        motivoNovedad,
        observacion: observacion.trim(),
        institucionDestino: esTraslado && destino ? destino : undefined,
      },
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
    <Dialog open onOpenChange={(o) => !pendiente && onOpenChange(o)}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{tituloAccion("Retirar", matriculas)}</DialogTitle>
          <MatriculasAfectadas matriculas={matriculas} />
          {uno && conComplementaria.length ? <BadgeComplementaria /> : null}
          {porSolicitud ? (
            <p className="inline-flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              Solicitud de {porSolicitud.establecimiento} · evidencia
              <PaperclipIcon className="size-4" aria-hidden />
              {porSolicitud.evidenciaNombre}
            </p>
          ) : null}
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
          {porSolicitud ? (
            // SOL.6: motivo elegido y protegido.
            <CampoSelect
              id="retiro-motivo"
              label="Motivo de retiro"
              required
              disabled
              value={MOTIVO_TRASLADO}
              onChange={() => {}}
              opciones={[{ value: MOTIVO_TRASLADO, label: MOTIVO_TRASLADO }]}
            />
          ) : (
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
          )}
        </div>

        {/* RET.1a: siempre visible; solo se habilita con Traslado. No aplica al retiro por solicitud. */}
        {porSolicitud ? null : (
          <Field variant="outlined" className="gap-1.5" data-invalid={(intentado && !destinoValido) || undefined}>
            <FieldLabel htmlFor="retiro-destino">Institución de destino</FieldLabel>
            <Input
              id="retiro-destino"
              maxLength={DESTINO_MAX}
              value={esTraslado ? institucionDestino : ""}
              disabled={!esTraslado}
              placeholder="Opcional"
              aria-invalid={intentado && !destinoValido}
              onChange={(e) => setInstitucionDestino(e.target.value)}
            />
            <FieldDescription className={cn(intentado && !destinoValido && "text-red")}>
              {intentado && !destinoValido
                ? `De ${DESTINO_MIN} a ${DESTINO_MAX} caracteres.`
                : "A qué institución se traslada el estudiante, si se sabe."}
            </FieldDescription>
          </Field>
        )}

        <CampoSelect
          id="retiro-novedad"
          label="Motivo de la novedad"
          required
          disabled={Boolean(porSolicitud)}
          value={motivoNovedad}
          onChange={setMotivoNovedad}
          opciones={MOTIVOS_NOVEDAD}
          invalido={intentado && !motivoNovedad}
          descripcion={porSolicitud ? undefined : "Quién originó el retiro. Sale en el acta de retiro para el SIMPADE."}
        />

        <Field variant="outlined" className="gap-1.5" data-invalid={(intentado && !observacionValida) || undefined}>
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
          <FieldDescription className={cn(intentado && !observacionValida && "text-red")}>
            Opcional; de {OBSERVACION_MIN} a {OBSERVACION_MAX} caracteres.
          </FieldDescription>
        </Field>

        <Aviso
          tono="advertencia"
          titulo={
            porSolicitud
              ? "La matrícula pasará a Retirado y la solicitud, a Atendida. Se tratará como traslado: no se abre caso de reintegración."
              : uno ? "La matrícula pasará a Retirado." : `Las ${matriculas.length} matrículas pasarán a Retirado.`}
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
        {/* Regla 12: retirar la complementaria no toca la principal. */}
        {matriculas.some((m) => m.tipo === "COMPLEMENTARIA") ? (
          <Aviso tono="info" titulo={uno ? "Es una matrícula complementaria: la principal sigue Cursando." : "Las matrículas complementarias se retiran solas: sus principales siguen Cursando."}>
            Se avisa al Administrador y al Gestor administrativo del establecimiento de la principal.
          </Aviso>
        ) : null}
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="destructive" size="sm" disabled={pendiente} onClick={confirmar}>
            {pendiente ? (
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
  /** Enlace del aviso por inasistencia continua: abre el diálogo al entrar, con esa novedad. */
  porInasistencia?: boolean
}

export function RetirarMatriculaDialog({ matricula, trigger = "icon", porInasistencia = false }: RetirarMatriculaDialogProps) {
  const [open, setOpen] = useState(porInasistencia)
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
      {open ? (
        <DialogRetirar
          matriculas={[matricula]}
          onOpenChange={setOpen}
          novedadInicial={porInasistencia ? NOVEDAD_INASISTENCIA : undefined}
        />
      ) : null}
    </>
  )
}
