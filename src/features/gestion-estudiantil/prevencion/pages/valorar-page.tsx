import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DatePicker } from "@/components/date-picker"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, XIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { DialogOfrecerPlan } from "@/features/gestion-estudiantil/prevencion/components/dialogos/dialog-ofrecer-plan"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import { useValorarForm } from "@/features/gestion-estudiantil/prevencion/hooks/use-valorar-form"
import { ANALISIS_MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { MarcoOpciones } from "@/components/marco-opciones"

function ValorarContent({ matricula: matriculaInicial }: { matricula?: number }) {
  const { volver, irPlanNuevo } = useNavegacionPrevencion()
  const f = useValorarForm(matriculaInicial, volver)
  const { selector, alertas } = f

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          ruta="Prevención"
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" type="button" variant="outline" color="neutral" disabled={f.pending} onClick={volver}>
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button size="sm" type="button" disabled={f.pending} onClick={f.enviar}>
                <IconoCarga cargando={f.pending}>
                  <FloppyDiskIcon data-icon="inline-start" />
                </IconoCarga>
                Guardar
              </Button>
            </div>
          }
        >
          Valorar riesgo
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-4 pb-6">
          <ErrorNoticeBanner error={f.errorBackend} />
          <ComboOpciones
            id="valoracion-estudiante"
            label="Estudiante"
            required
            size="default"
            todos={false}
            placeholder="Buscar estudiante"
            value={selector.estudiante}
            options={selector.opciones}
            error={f.error("estudiante")}
            onInputChange={selector.onBuscar}
            onChange={selector.elegir}
          />
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(f.error("fecha")) || undefined}>
            <FieldLabel htmlFor="valoracion-fecha">Fecha*</FieldLabel>
            <DatePicker
              id="valoracion-fecha"
              value={f.fecha}
              maxDate={new Date()}
              aria-invalid={Boolean(f.error("fecha")) || undefined}
              onChange={f.setFecha}
            />
            {f.error("fecha") && <FieldError>{f.error("fecha")}</FieldError>}
          </Field>

          {selector.estudiante && (
            <p className="text-sm" aria-live="polite">
              <span className="text-muted-foreground">Alertas consideradas: </span>
              {alertas.cargando ? (
                <span className="text-muted-foreground">consultando…</span>
              ) : alertas.consideradas.length > 0 ? (
                alertas.consideradas.join(" · ")
              ) : (
                "Sin alertas vigentes."
              )}
              {alertas.faltanDatos && (
                <span className="block text-xs text-muted-foreground">
                  Faltan datos de asistencia o de edad para calcular algunas señales.
                </span>
              )}
            </p>
          )}

          <MarcoOpciones id="valoracion-nivel" label="Nivel de riesgo" required error={f.error("nivel")}>
            <RadioGroup
              aria-labelledby="valoracion-nivel-label"
              aria-invalid={Boolean(f.error("nivel")) || undefined}
              value={f.nivel}
              onValueChange={f.setNivel}
            >
              {f.nivelOpciones.map((n) => (
                <label key={n.value} className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value={n.value} />
                  {n.label}
                </label>
              ))}
            </RadioGroup>
          </MarcoOpciones>

          <TextoLargo
            id="valoracion-analisis"
            label="Análisis"
            required
            max={ANALISIS_MAX}
            rows={5}
            placeholder="Análisis del riesgo de deserción del estudiante"
            value={f.analisis}
            error={f.error("analisis")}
            onChange={f.setAnalisis}
          />
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>

      {f.guardada != null && f.estudianteNombre && (
        <DialogOfrecerPlan
          estudianteNombre={f.estudianteNombre}
          onAhoraNo={volver}
          onCrearPlan={() => irPlanNuevo(Number(selector.estudiante), f.guardada as number)}
        />
      )}
    </>
  )
}

/** Valorar riesgo (G.8.TAB.4): estudiante, fecha, nivel y análisis, con las alertas vigentes que se consideran. */
export function ValorarPage({ matricula }: { matricula?: number }) {
  return (
    <NoticeProvider>
      <TableScreen>
        <ValorarContent matricula={matricula} />
      </TableScreen>
    </NoticeProvider>
  )
}
