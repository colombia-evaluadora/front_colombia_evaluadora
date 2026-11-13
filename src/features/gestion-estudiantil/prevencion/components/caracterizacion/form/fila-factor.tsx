import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

import type { OpcionCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { FactorDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { CampoFecha } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-fecha"
import { CampoTexto } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campo-texto"
import type { useRevisionFactores } from "@/features/gestion-estudiantil/prevencion/hooks/use-revision-factores"
import { MAX, type FactorForm } from "@/features/gestion-estudiantil/prevencion/utils/formularios-caracterizacion"

type Revision = ReturnType<typeof useRevisionFactores>

interface Props {
  opcion: OpcionCatalogo
  factor: FactorForm
  /** El factor tal como está en el servidor (responsable y fecha de revisión, solo lectura). */
  actual: FactorDetalle | undefined
  rev: Revision
  deshabilitado: boolean
}

/** Un factor de vulnerabilidad: casilla, su estado, y con él marcado su fuente y fecha; desmarcar uno vigente pide el motivo. */
export function FilaFactor({ opcion, factor, actual, rev, deshabilitado }: Props) {
  const clave = factor.factor
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={factor.marcado}
            disabled={deshabilitado}
            onCheckedChange={(marcado) => rev.cambiarFactor(clave, { marcado })}
          />
          {opcion.label}
        </label>
        {factor.estado === "VIGENTE" && (
          <Badge variant="soft" color="success">
            Vigente
          </Badge>
        )}
        {factor.estado === "PENDIENTE" && (
          <Badge variant="soft" color="warning">
            Pendiente de revisión
          </Badge>
        )}
        {actual?.responsable && (
          <span className="text-xs text-muted-foreground">
            Responsable: {actual.responsable}
            {actual.fecha_revision ? ` · Revisado el ${formatFecha(actual.fecha_revision)}` : ""}
          </span>
        )}
      </div>
      {factor.marcado && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CampoTexto
            id={`revision-fuente-${clave}`}
            label="Fuente"
            required
            max={MAX.fuente}
            value={factor.fuente}
            disabled={deshabilitado}
            error={rev.error(`revision-fuente-${clave}`)}
            onChange={(fuente) => rev.cambiarFactor(clave, { fuente })}
          />
          <CampoFecha
            id={`revision-fecha-${clave}`}
            label="Fecha de conocimiento"
            required
            value={factor.fecha}
            disabled={deshabilitado}
            error={rev.error(`revision-fecha-${clave}`)}
            onChange={(fecha) => rev.cambiarFactor(clave, { fecha })}
          />
        </div>
      )}
      {!factor.marcado && factor.estado === "VIGENTE" && (
        <CampoTexto
          id={`revision-motivo-${clave}`}
          label="Motivo por el que deja de aplicar"
          required
          max={MAX.fuente}
          value={factor.motivo}
          disabled={deshabilitado}
          error={rev.error(`revision-motivo-${clave}`)}
          onChange={(motivo) => rev.cambiarFactor(clave, { motivo })}
        />
      )}
    </div>
  )
}
