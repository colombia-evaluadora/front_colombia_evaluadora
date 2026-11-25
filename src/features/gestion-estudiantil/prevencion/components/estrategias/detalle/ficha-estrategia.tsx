import { Link } from "@tanstack/react-router"

import { FichaDatos } from "@/components/ficha-datos"
import { paths } from "@/config/paths"
import { abreviarPersona, formatFecha, formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { EstrategiaDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { formatBeneficiarios, formatRangoFechas } from "@/features/gestion-estudiantil/prevencion/utils/formularios-estrategias"

/** Ficha de la estrategia (G.8.EST.7): tipo, período, fechas, responsable, financiación, beneficiarios, descripción y, si cerró, su resultado. */
export function FichaEstrategia({ estrategia: e }: { estrategia: EstrategiaDetalle }) {
  return (
    <section aria-label="Datos de la estrategia">
      <FichaDatos
        datos={[
          { etiqueta: "Tipo de estrategia", valor: e.tipo_nombre },
          { etiqueta: "Período académico", valor: e.periodo_nombre },
          { etiqueta: "Fechas", valor: formatRangoFechas(e.fecha_inicio, e.fecha_fin) },
          { etiqueta: "Responsable", valor: abreviarPersona(e.responsable_nombre) },
          { etiqueta: "Fuente de financiación", valor: e.fuente_financiacion },
          { etiqueta: "Beneficiarios", valor: formatBeneficiarios(e.beneficiarios_activos, e.meta) },
          { etiqueta: "Descripción", valor: e.descripcion, ancho: true },
          ...(e.requisitos_ingreso ? [{ etiqueta: "Requisitos de ingreso", valor: e.requisitos_ingreso, ancho: true }] : []),
          ...(e.fk_testrategia_origen != null
            ? [
                {
                  etiqueta: "Copiada de",
                  valor: (
                    <Link
                      to={paths.app.prevencionEstrategiaDetalle.getHref(e.fk_testrategia_origen) as never}
                      className="text-primary hover:underline"
                    >
                      Ver la estrategia de origen
                    </Link>
                  ),
                },
              ]
            : []),
          ...(e.estado === "FINALIZADA"
            ? [
                {
                  etiqueta: `Resultado${e.finalizada_en ? ` · finalizada el ${formatFechaHora(e.finalizada_en) || formatFecha(e.finalizada_en)}` : ""}`,
                  valor: e.resultado,
                  ancho: true,
                },
              ]
            : []),
        ]}
      />
    </section>
  )
}
