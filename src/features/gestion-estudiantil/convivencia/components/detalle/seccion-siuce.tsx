import { nombreDe, useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { Dato } from "@/features/gestion-estudiantil/convivencia/components/detalle/dato"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
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
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Dato label="Tipo de daño">{(caso.tipos_dano ?? []).map((d) => nombreDe(danos, d)).filter(Boolean).join(", ")}</Dato>
        <Dato label="Tipo de agresión">{nombreDe(agresiones, caso.fk_tlv_tipo_agresion)}</Dato>
        <Dato label="Evento generador">{nombreDe(eventos, caso.fk_tlv_evento_generador)}</Dato>
        <Dato label="Situación repetitiva">{siNo(caso.situacion_repetitiva)}</Dato>
        <Dato label="Secuelas físicas">{siNo(caso.secuelas_fisicas)}</Dato>
        <Dato label="Soporte">{caso.fk_tarchivo_soporte ? "Adjunto" : ""}</Dato>
      </dl>
    </SeccionPlegable>
  )
}
