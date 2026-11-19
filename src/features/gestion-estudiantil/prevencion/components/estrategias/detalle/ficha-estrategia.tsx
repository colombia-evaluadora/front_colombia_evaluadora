import { Link } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { abreviarPersona, formatFecha, formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { EstrategiaDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { formatBeneficiarios, formatRangoFechas } from "@/features/gestion-estudiantil/prevencion/utils/formularios-estrategias"

/** Ficha de la estrategia (G.8.EST.7): tipo, período, fechas, responsable, financiación, beneficiarios, descripción y, si cerró, su resultado. */
export function FichaEstrategia({ estrategia: e }: { estrategia: EstrategiaDetalle }) {
  return (
    <section aria-label="Datos de la estrategia" className="rounded-lg border p-4">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Dato label="Tipo de estrategia">{e.tipo_nombre}</Dato>
        <Dato label="Período Académico">{e.periodo_nombre}</Dato>
        <Dato label="Fechas">{formatRangoFechas(e.fecha_inicio, e.fecha_fin)}</Dato>
        <Dato label="Responsable">{abreviarPersona(e.responsable_nombre)}</Dato>
        <Dato label="Fuente de financiación">{e.fuente_financiacion}</Dato>
        <Dato label="Beneficiarios">{formatBeneficiarios(e.beneficiarios_activos, e.meta)}</Dato>
        <div className="sm:col-span-2 xl:col-span-3">
          <Dato label="Descripción">{e.descripcion}</Dato>
        </div>
        {e.requisitos_ingreso && (
          <div className="sm:col-span-2 xl:col-span-3">
            <Dato label="Requisitos de ingreso">{e.requisitos_ingreso}</Dato>
          </div>
        )}
        {e.fk_testrategia_origen != null && (
          <Dato label="Copiada de">
            <Link
              to={paths.app.prevencionEstrategiaDetalle.getHref(e.fk_testrategia_origen) as never}
              className="text-primary hover:underline"
            >
              Ver la estrategia de origen
            </Link>
          </Dato>
        )}
        {e.estado === "FINALIZADA" && (
          <div className="sm:col-span-2 xl:col-span-3">
            <Dato label={`Resultado${e.finalizada_en ? ` · finalizada el ${formatFechaHora(e.finalizada_en) || formatFecha(e.finalizada_en)}` : ""}`}>
              {e.resultado}
            </Dato>
          </div>
        )}
      </dl>
    </section>
  )
}
