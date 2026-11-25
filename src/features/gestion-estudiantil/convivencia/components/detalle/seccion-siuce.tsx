import { FichaDatos } from "@/components/ficha-datos"

import { nombreDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { siNoTexto as siNo } from "@/features/gestion-estudiantil/convivencia/utils/detalle"

/** «Datos para el SIUCE» en solo lectura. */
export function SeccionSiuceDetalle({ caso }: { caso: CasoDetalle }) {
  const danos = useCatalogo("TIPO_DANO")
  const agresiones = useCatalogo("TIPO_AGRESION")
  const eventos = useCatalogo("EVENTO_GENERADOR")
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      defaultAbierta={false}
      titulo="Datos para el SIUCE"
      contentClassName="flex flex-col gap-3 px-4 py-4"
    >
      <FichaDatos
        datos={[
          { etiqueta: "Tipo de daño", valor: (caso.tipos_dano ?? []).map((d) => nombreDe(danos, d)).filter(Boolean).join(", ") },
          { etiqueta: "Tipo de agresión", valor: nombreDe(agresiones, caso.fk_tlv_tipo_agresion) },
          { etiqueta: "Evento generador", valor: nombreDe(eventos, caso.fk_tlv_evento_generador) },
          { etiqueta: "Situación repetitiva", valor: siNo(caso.situacion_repetitiva) },
          { etiqueta: "Secuelas físicas", valor: siNo(caso.secuelas_fisicas) },
          { etiqueta: "Soporte", valor: caso.fk_tarchivo_soporte ? "Adjunto" : "" },
        ]}
      />
    </SeccionPlegable>
  )
}
