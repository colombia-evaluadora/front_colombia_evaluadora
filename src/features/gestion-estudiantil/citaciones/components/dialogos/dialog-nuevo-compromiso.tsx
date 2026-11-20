import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/date-picker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ControlPointIcon, FloppyDiskIcon, InfoIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import type { OrigenManual } from "@/features/gestion-estudiantil/citaciones/api/types"
import { CampoAcudiente } from "@/features/gestion-estudiantil/citaciones/components/campo-acudiente"
import { CampoOrigen } from "@/features/gestion-estudiantil/citaciones/components/campo-origen"
import { CampoEstudiante } from "@/features/gestion-estudiantil/citaciones/components/campo-estudiante"
import { FilaCompromiso } from "@/features/gestion-estudiantil/citaciones/components/fila-compromiso"
import {
  useCompromisoForm,
  type CompromisoFormState,
} from "@/features/gestion-estudiantil/citaciones/hooks/use-compromiso-form"
import {
  itemVacio,
  type ItemFila,
} from "@/features/gestion-estudiantil/citaciones/utils/formularios"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import { MarcoOpciones } from "@/components/marco-opciones"

function CampoFecha({
  id,
  label,
  value,
  error,
  maxDate,
  minDate,
  onChange,
}: {
  id: string
  label: string
  value: string
  error?: string
  maxDate?: Date
  minDate?: Date
  onChange: (value: string) => void
}) {
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="gap-2"
      data-invalid={Boolean(error) || undefined}
    >
      <FieldLabel htmlFor={id}>{label}*</FieldLabel>
      <DatePicker
        id={id}
        maxDate={maxDate}
        minDate={minDate}
        value={parseDateValue(value)}
        aria-invalid={Boolean(error) || undefined}
        onChange={(date) => onChange(date ? formatDateValue(date) : "")}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

function ConstructorCompromisos({ form }: { form: CompromisoFormState }) {
  const { v, set, errores, intento } = form
  const responsables = useCatalogo("RESPONSABLE_COMPROMISO").map((r) => ({
    value: r.value,
    label: r.label,
  }))
  const cambiar = (key: string, patch: Partial<ItemFila>) =>
    set({ items: v.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) })

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <SeccionPlegable
        titulo="Compromisos"
        forzarAbierta={
          intento && (Object.keys(errores.items).length > 0 || Boolean(errores.sinItems))
        }
        contentClassName="flex flex-col gap-3 p-4"
        accion={
          <Button
            type="button"
            size="sm"
            variant="outline"
            color="neutral"
            onClick={() => set({ items: [...v.items, itemVacio()] })}
          >
            <ControlPointIcon data-icon="inline-start" />
            Agregar compromiso
          </Button>
        }
      >
        {errores.sinItems && (
          <p role="alert" data-invalid className="text-sm text-red">
            {errores.sinItems}
          </p>
        )}
        {v.items.map((f, i) => (
          <FilaCompromiso
            key={f.key}
            fila={f}
            numero={i + 1}
            error={errores.items[f.key]}
            responsables={responsables}
            desde={v.fecha}
            hasta={v.revision}
            puedeQuitar={v.items.length > 1}
            onChange={(patch) => cambiar(f.key, patch)}
            onQuitar={() => set({ items: v.items.filter((x) => x.key !== f.key) })}
          />
        ))}
      </SeccionPlegable>
    </div>
  )
}

/** Datos con los que se abre el modal: vacío, desde una citación Asistió, o con origen desde Convivencia / Observador. */
export interface NuevoCompromisoInicial {
  citacion?: number
  origen?: OrigenManual
  matricula?: number
  estudiante?: string
}

/**
 * Nuevo compromiso (G.3.CMP.4, Gestión Estudiantil 4.2) en un modal sobre el listado. Al guardar lleva al
 * detalle del compromiso creado. Se monta solo mientras está abierto, así cada apertura arranca limpia.
 */
export function DialogNuevoCompromiso({
  citacion,
  origen: origenManual,
  matricula,
  estudiante,
  onClose,
}: NuevoCompromisoInicial & { onClose: () => void }) {
  const form = useCompromisoForm(citacion, origenManual, matricula, estudiante)
  const { v, set, errores, error, origen, nombre, elegirEstudiante, guardando, guardar } = form
  const tipos = useCatalogo("TIPO_COMPROMISO")

  return (
    <DialogoOperacionShell
      titulo="Nuevo compromiso"
      onClose={onClose}
      error={error}
      pending={guardando}
      className="sm:max-w-4xl"
      confirmar={{
        label: "Guardar",
        icon: <FloppyDiskIcon data-icon="inline-start" />,
        onClick: guardar,
      }}
    >
      <div className="flex flex-col gap-5 pt-2">
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
          <CampoEstudiante
            id="compromiso-estudiante"
            value={v.matricula}
            nombre={nombre}
            error={errores.matricula}
            soloLectura={
              citacion != null || (matricula != null && origenManual?.tipo === "ANOTACION")
            }
            onChange={elegirEstudiante}
          />
          <CampoAcudiente id="compromiso-acudiente" matricula={v.matricula} />
          <MarcoOpciones
            id="compromiso-tipo"
            label="Tipo de compromiso"
            required
            error={errores.tipo}
          >
            <RadioGroup
              aria-labelledby="compromiso-tipo-label"
              value={v.tipo}
              onValueChange={(tipo) => set({ tipo })}
            >
              {tipos.map((t) => (
                <label key={t.value} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={t.value} />
                  {t.label}
                </label>
              ))}
            </RadioGroup>
          </MarcoOpciones>
        </div>

        {citacion != null && (
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="compromiso-origen">Registro de origen</FieldLabel>
            <Input
              id="compromiso-origen"
              readOnly
              value={
                origen
                  ? `Citación del ${formatFecha(origen.fecha_programada)}`
                  : `Citación #${citacion}`
              }
            />
          </Field>
        )}
        {citacion == null && origenManual && (
          <CampoOrigen id="compromiso-origen-manual" origen={origenManual} />
        )}

        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          <CampoFecha
            id="compromiso-fecha"
            label="Fecha"
            value={v.fecha}
            error={errores.fecha}
            maxDate={new Date()}
            onChange={(fecha) => set({ fecha })}
          />
          <CampoFecha
            id="compromiso-revision"
            label="Fecha de revisión"
            value={v.revision}
            error={errores.revision}
            minDate={
              v.fecha ? new Date(parseDateValue(v.fecha)!.getTime() + 86_400_000) : undefined
            }
            onChange={(revision) => set({ revision })}
          />
        </div>

        <ConstructorCompromisos form={form} />

        {/* G.3.CMP.4: el interruptor y, debajo y solo si se aceptó presencialmente, el soporte firmado
            a todo el ancho (sin aceptación no hay soporte que adjuntar). */}
        <div className="flex flex-col gap-4">
          <MarcoOpciones id="compromiso-aceptado">
            <label className="flex items-center gap-3">
              <Switch
                round
                checked={v.aceptado}
                onCheckedChange={(aceptado) =>
                  set({ aceptado, soporte: aceptado ? v.soporte : null })
                }
              />
              Aceptado presencialmente
            </label>
          </MarcoOpciones>
          {v.aceptado && (
            <div
              className="flex flex-col gap-1"
              data-invalid={Boolean(errores.soporte) || undefined}
            >
              <SoportesUpload
                label="Soporte firmado*"
                max={1}
                archivos={v.soporte ? [v.soporte] : []}
                onChange={(archivos) => set({ soporte: archivos[0] ?? null })}
              />
              {errores.soporte ? (
                <FieldError>{errores.soporte}</FieldError>
              ) : (
                <p className="text-xs text-muted-foreground">PDF o imagen, máximo 10 MB.</p>
              )}
            </div>
          )}
        </div>

        {!v.aceptado && (
          <Alert variant="info">
            <InfoIcon aria-hidden="true" />
            <AlertDescription>
              Sin aceptación presencial, el compromiso queda Pendiente de aceptación hasta que el
              acudiente lo acepte en el portal.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DialogoOperacionShell>
  )
}
