import { Field, FieldLabel } from "@/components/ui/field"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { SenalSMDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeSeveridad } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/badges-senal"
import type { useSenalDetalle } from "@/features/gestion-estudiantil/prevencion/hooks/use-senal-detalle"
import { NOTAS_MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios-salud-mental"

interface Props {
  senal: SenalSMDetalle
  d: ReturnType<typeof useSenalDetalle>
}

/**
 * Valoración: el formulario (Severidad y Notas) mientras la señal se puede valorar; después, la última
 * valoración en lectura. Quien reportó sin acceso sensible no la ve (Regla 1).
 */
export function SeccionValoracionSenal({ senal: s, d }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {s.valorada_por && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Severidad:</span>
          <BadgeSeveridad valor={s.severidad_valor} nombre={s.severidad_nombre} />
          <span className="text-muted-foreground">
            · valorada por {abreviarPersona(s.valorada_por)} el {formatFecha(s.fecha_valoracion)}
          </span>
        </p>
      )}
      {s.notas_valoracion && (
        <p className="text-sm">
          <span className="text-muted-foreground">Notas de valoración: </span>
          {s.notas_valoracion}
        </p>
      )}
      {s.puede_valorar && (
        <div className="flex flex-col gap-4">
          <ComboOpciones
            id="senal-severidad"
            label={s.valorada_por ? "Nueva severidad" : "Severidad"}
            required
            size="default"
            todos={false}
            placeholder="Seleccione"
            value={d.severidad}
            options={d.severidadOpciones}
            error={d.error("severidad")}
            onChange={d.setSeveridad}
          />
          <TextoLargo
            id="senal-notas"
            label="Notas de valoración"
            required
            max={NOTAS_MAX}
            rows={5}
            value={d.notas}
            error={d.error("notas")}
            onChange={d.setNotas}
          />
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      )}
      {s.valoraciones.length > 1 && (
        <Field orientation="vertical" className="gap-1">
          <FieldLabel>Historial de valoraciones</FieldLabel>
          <ul className="flex flex-col gap-1 text-sm">
            {s.valoraciones.map((v) => (
              <li key={v.id}>
                {formatFecha(v.fecha)} · {v.severidad_nombre} · {abreviarPersona(v.valorada_por)}: {v.notas}
              </li>
            ))}
          </ul>
        </Field>
      )}
    </div>
  )
}
