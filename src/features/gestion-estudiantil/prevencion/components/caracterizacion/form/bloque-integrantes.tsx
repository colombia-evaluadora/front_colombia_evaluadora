import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ControlPointIcon, InfoIcon, LockIcon } from "@/components/ui/icons"

import { FilaIntegrante } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/fila-integrante"
import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"

/** Aviso del contraste entre las personas declaradas y las convivientes identificadas (no inventa personas ni cambia el total). */
function avisoDiferencia(diferencia: number | null, identificados: number): string | null {
  if (diferencia == null || diferencia === 0) return null
  return diferencia > 0
    ? `Faltan ${diferencia} ${diferencia === 1 ? "persona" : "personas"} por identificar: el hogar declara más personas que los convivientes registrados (${identificados}, contando al estudiante).`
    : `Hay ${-diferencia} ${-diferencia === 1 ? "conviviente" : "convivientes"} más que las personas del hogar declaradas: revise el total.`
}

/** Constructor repetible de integrantes del núcleo familiar y personas de apoyo, con el acudiente de Cobertura en solo lectura. */
export function BloqueIntegrantes({ f }: { f: FormularioCaracterizacion }) {
  const derivado = f.detalle.hogar.integrantes.find((i) => i.derivado)
  const aviso = avisoDiferencia(f.diferenciaHogar, f.identificados)
  const total = f.v.integrantes.length + (derivado ? 1 : 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">Integrantes del núcleo familiar y personas de apoyo ({total})</h3>
        {!f.lectura && (
          <Button type="button" size="sm" variant="outline" color="neutral" className="ml-auto" onClick={f.integrantes.agregar}>
            <ControlPointIcon data-icon="inline-start" />
            Agregar integrante
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Convivientes y familiares o apoyos no convivientes. Una persona es una sola fila.
      </p>
      {aviso && (
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}
      {derivado && (
        <div className="flex flex-col gap-1 rounded-lg border border-dashed border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">Acudiente de la matrícula</h3>
            <Badge variant="soft" color="info">
              Cobertura Educativa
            </Badge>
            <LockIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          </div>
          <p className="text-sm">
            {[derivado.parentesco?.nombre, derivado.nombre].filter(Boolean).join(" · ") || "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            Viene de la matrícula: no se presume conviviente ni cuidador. Si vive con el estudiante o lo cuida, agréguelo
            como integrante.
          </p>
        </div>
      )}
      {f.v.integrantes.map((i, n) => (
        <FilaIntegrante key={i.clave} f={f} integrante={i} indice={n} />
      ))}
      {total === 0 && <p className="text-sm text-muted-foreground">Aún no hay integrantes registrados.</p>}
    </div>
  )
}
