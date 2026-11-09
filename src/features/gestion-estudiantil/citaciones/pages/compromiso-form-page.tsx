import { DatePicker } from "@/components/date-picker"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, FloppyDiskIcon, InfoIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { IconoCarga } from "@/features/gestion-estudiantil/components/icono-carga"
import { CampoEstudiante } from "@/features/gestion-estudiantil/citaciones/components/campo-estudiante"
import { FilaCompromiso } from "@/features/gestion-estudiantil/citaciones/components/fila-compromiso"
import {
  useCompromisoForm,
  type CompromisoFormState,
} from "@/features/gestion-estudiantil/citaciones/hooks/use-compromiso-form"
import { itemVacio, type ItemFila } from "@/features/gestion-estudiantil/citaciones/utils/formularios"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import { SoportesUpload } from "@/features/gestion-estudiantil/convivencia/components/soportes-upload"

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
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
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
  const responsables = useCatalogo("RESPONSABLE_COMPROMISO").map((r) => ({ value: r.value, label: r.label }))
  const cambiar = (key: string, patch: Partial<ItemFila>) =>
    set({ items: v.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) })

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <SeccionPlegable
        titulo="Compromisos"
        forzarAbierta={intento && (Object.keys(errores.items).length > 0 || Boolean(errores.sinItems))}
        contentClassName="flex flex-col gap-3 p-4"
        accion={
          <Button type="button" size="sm" variant="outline" onClick={() => set({ items: [...v.items, itemVacio()] })}>
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

function CompromisoForm({ citacion }: { citacion: number | undefined }) {
  const form = useCompromisoForm(citacion)
  const { v, set, errores, origen, nombre, elegirEstudiante, guardando, guardar, volver } = form
  const tipos = useCatalogo("TIPO_COMPROMISO")

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" color="neutral" onClick={volver} disabled={guardando}>
                Cancelar
              </Button>
              <Button size="sm" onClick={guardar} disabled={guardando}>
                <IconoCarga cargando={guardando}>
                  <FloppyDiskIcon data-icon="inline-start" />
                </IconoCarga>
                Guardar
              </Button>
            </div>
          }
        >
          Citaciones y compromisos › Nuevo compromiso
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-5 pb-6">
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
            <CampoEstudiante
              id="compromiso-estudiante"
              value={v.matricula}
              nombre={nombre}
              error={errores.matricula}
              soloLectura={citacion != null}
              onChange={elegirEstudiante}
            />
            <Field
              orientation="vertical"
              variant="outlined"
              className="gap-2"
              role="group"
              aria-labelledby="compromiso-tipo-label"
              data-invalid={Boolean(errores.tipo) || undefined}
            >
              <FieldLabel id="compromiso-tipo-label">Tipo de compromiso*</FieldLabel>
              <RadioGroup
                aria-labelledby="compromiso-tipo-label"
                className="flex h-11 flex-row items-center gap-6 pr-3 pl-3.5"
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
              {errores.tipo && <FieldError>{errores.tipo}</FieldError>}
            </Field>
            {citacion != null && (
              <Field orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor="compromiso-origen">Registro de origen</FieldLabel>
                <Input
                  id="compromiso-origen"
                  readOnly
                  value={origen ? `Citación del ${formatFecha(origen.fecha_programada)}` : `Citación #${citacion}`}
                />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
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
              minDate={v.fecha ? new Date(parseDateValue(v.fecha)!.getTime() + 86_400_000) : undefined}
              onChange={(revision) => set({ revision })}
            />
          </div>

          <ConstructorCompromisos form={form} />

          {/* G.3.CMP.4: el interruptor a su ancho natural y el soporte ocupa el resto de la fila. */}
          <div className="grid grid-cols-1 items-start gap-x-8 gap-y-3 sm:grid-cols-[auto_1fr]">
            <label className="flex h-11 items-center gap-3 text-sm">
              <Switch
                round
                checked={v.aceptado}
                onCheckedChange={(aceptado) => set({ aceptado, soporte: aceptado ? v.soporte : null })}
              />
              Aceptado presencialmente
            </label>
            <div className="flex flex-col gap-1" data-invalid={Boolean(errores.soporte) || undefined}>
              <SoportesUpload
                label={v.aceptado ? "Soporte firmado*" : "Soporte firmado"}
                max={1}
                disabled={!v.aceptado}
                archivos={v.soporte ? [v.soporte] : []}
                onChange={(archivos) => set({ soporte: archivos[0] ?? null })}
              />
              {errores.soporte ? (
                <FieldError>{errores.soporte}</FieldError>
              ) : (
                <p className="text-xs text-muted-foreground">PDF o imagen, máximo 10 MB. Obligatorio si se acepta presencialmente.</p>
              )}
            </div>
          </div>

          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>
              Sin aceptación presencial, el compromiso queda Pendiente de aceptación hasta que el acudiente lo acepte en el portal.
            </AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}

/** Nuevo compromiso (G.3.CMP.4, Gestión Estudiantil 4.2): vacío o desde una citación Asistió (`?citacion=`). */
export function CompromisoFormPage({ citacion }: { citacion?: number }) {
  return (
    <NoticeProvider>
      <TableScreen>
        <CompromisoForm key={citacion ?? "libre"} citacion={citacion} />
      </TableScreen>
    </NoticeProvider>
  )
}
