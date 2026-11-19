import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, InfoIcon } from "@/components/ui/icons"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { CampoLista } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-lista"
import { FilaFactor } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/fila-factor"
import { HistorialFactores } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/historial-factores"
import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"
import { useRevisionFactores } from "@/features/gestion-estudiantil/prevencion/hooks/use-revision-factores"
import { MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios-caracterizacion"

/**
 * Factores de vulnerabilidad (solo el establecimiento): tarjeta aparte con su propia acción «Registrar revisión»,
 * independiente de la confirmación familiar. Se habilita con `puede_revisar_factores` (orientación, Supervisor de sede,
 * Administrador y Profesional de trabajo social en su sede y jornada).
 */
export function SeccionFactores({ f }: { f: FormularioCaracterizacion }) {
  const { detalle } = f
  const rev = useRevisionFactores(detalle, f.listas)
  const e = detalle.establecimiento
  const puede = detalle.puede_revisar_factores
  const deshabilitado = !puede || rev.pending

  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo="Factores de vulnerabilidad (solo el establecimiento)"
      accion={
        <Button size="sm" type="button" disabled={deshabilitado} onClick={rev.registrar}>
          <IconoCarga cargando={rev.pending}>
            <FloppyDiskIcon data-icon="inline-start" />
          </IconoCarga>
          Registrar revisión
        </Button>
      }
      contentClassName="flex flex-col gap-4 px-4 py-4"
    >
      <ErrorNoticeBanner error={rev.errorBackend} />
      {!puede && (
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertDescription>No tiene permiso para registrar la revisión de factores de este estudiante.</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        Sin revisar significa que falta comprobación, no ausencia de factores.
        {e.fecha_revision
          ? ` Última revisión: ${e.revision_factores?.nombre ?? "—"}, el ${formatFecha(e.fecha_revision)}${e.revisada_por ? ` por ${e.revisada_por}` : ""}.`
          : ` Estado actual: ${e.revision_factores?.nombre ?? "Sin revisar"}.`}
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CampoLista
          id="revision-resultado"
          label="Revisión de factores"
          required
          opciones={rev.opcionesRevision}
          value={rev.r.revision}
          disabled={deshabilitado}
          error={rev.error("revision-resultado")}
          onChange={(revision) => rev.set({ revision })}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {rev.r.factores.map((factor) => (
          <FilaFactor
            key={factor.factor}
            opcion={rev.opcionesFactor.find((o) => o.value === factor.factor)!}
            factor={factor}
            actual={e.factores.find((x) => String(x.factor.id) === factor.factor && x.estado !== "DESACTIVADO")}
            rev={rev}
            deshabilitado={deshabilitado}
          />
        ))}
      </div>
      <TextoLargo
        id="revision-observaciones"
        label="Observaciones"
        required={rev.r.factores.some((x) => x.marcado && rev.esOtro(x.factor))}
        max={MAX.observaciones}
        rows={3}
        value={rev.r.observaciones}
        disabled={deshabilitado}
        error={rev.error("revision-observaciones")}
        onChange={(observaciones) => rev.set({ observaciones })}
      />
      <HistorialFactores e={e} />
    </SeccionPlegable>
  )
}
