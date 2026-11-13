import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ControlPointIcon, PersonRemoveIcon } from "@/components/ui/icons"

import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { BeneficiarioEstrategia, EstrategiaDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"

interface Props {
  estrategia: EstrategiaDetalle
  onAgregar: () => void
  onRetirar: (b: BeneficiarioEstrategia) => void
  onVerTodos: () => void
}

function DetalleBeneficiario({ b }: { b: BeneficiarioEstrategia }) {
  if (b.fecha_salida)
    return (
      <span className="text-muted-foreground">
        {b.grado_grupo} · {formatFecha(b.fecha_ingreso)} a {formatFecha(b.fecha_salida)}
        {b.resultado_salida_nombre ? ` · ${b.resultado_salida_nombre}` : ""}
        {b.motivo_salida ? ` · ${b.motivo_salida}` : ""}
      </span>
    )
  return (
    <span className="text-muted-foreground">
      {b.grado_grupo} · desde {formatFecha(b.fecha_ingreso)}
      {b.origen_plan ? " (plan de acompañamiento)" : ""}
    </span>
  )
}

/** Beneficiarios dentro del formulario de modificar (G.8.EST.4): Retirar por fila, Agregar y «… y N beneficiarios más». */
export function BloqueBeneficiarios({ estrategia: e, onAgregar, onRetirar, onVerTodos }: Props) {
  const restantes = e.beneficiarios_total - e.beneficiarios.length
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo={`Beneficiarios (${e.beneficiarios_total})`}
      accion={
        <Button size="sm" type="button" variant="outline" disabled={!e.puede_agregar_beneficiarios} onClick={onAgregar}>
          <ControlPointIcon data-icon="inline-start" />
          Agregar beneficiarios
        </Button>
      }
      contentClassName="flex flex-col px-4 py-2"
    >
      {e.beneficiarios.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">Esta estrategia aún no tiene beneficiarios.</p>
      ) : (
        <ul>
          {e.beneficiarios.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0">
              <span>
                <span className="font-medium">{b.estudiante_nombre}</span> · <DetalleBeneficiario b={b} />
              </span>
              {b.fecha_salida ? (
                <Badge variant="soft" color="muted">
                  <span>Retirada</span>
                </Badge>
              ) : (
                <Button size="sm" type="button" variant="outline" disabled={!b.puede_retirar} onClick={() => onRetirar(b)}>
                  <PersonRemoveIcon data-icon="inline-start" />
                  Retirar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {restantes > 0 && (
        <p className="pb-2 text-xs text-muted-foreground">
          … y {restantes} {restantes === 1 ? "beneficiario más" : "beneficiarios más"}.{" "}
          <Button variant="link" size="sm" type="button" onClick={onVerTodos}>
            Ver todos
          </Button>
        </p>
      )}
    </SeccionPlegable>
  )
}
