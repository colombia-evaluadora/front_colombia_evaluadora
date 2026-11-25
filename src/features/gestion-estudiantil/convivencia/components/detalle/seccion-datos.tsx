import { FichaDatos } from "@/components/ficha-datos"
import { Badge } from "@/components/ui/badge"

import { nombreDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { fechaHechosTexto } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"

/** «Datos del caso»: fechas, catálogos, reporte, gestor, anotaciones de origen y descripción. */
export function SeccionDatosCasoDetalle({ caso }: { caso: CasoDetalle }) {
  const manifestaciones = useCatalogo("MANIFESTACION_SITUACION")
  const lugares = useCatalogo("LUGAR_SITUACION")
  const resultados = useCatalogo("RESULTADO_SEGUIMIENTO")
  const { fecha, hora } = fechaHechosTexto(caso)
  return (
    <SeccionPlegable encuadrada comoSeccion titulo="Datos del caso" contentClassName="flex flex-col gap-3 px-4 py-4">
      <FichaDatos
        datos={[
          { etiqueta: "Fecha de los hechos", valor: hora ? `${fecha} · ${hora}` : fecha },
          { etiqueta: "Fecha de conocimiento", valor: formatFecha(caso.fecha_conocimiento) },
          { etiqueta: "Manifestación", valor: nombreDe(manifestaciones, caso.fk_tlv_manifestacion) },
          { etiqueta: "Lugar", valor: nombreDe(lugares, caso.fk_tlv_lugar) },
          { etiqueta: "Reportado por", valor: caso.reporta_nombre },
          {
            etiqueta: "Gestor",
            valor: caso.fk_funcionario_gestor ? (
              caso.gestor_nombre
            ) : (
              <Badge variant="soft" color="warning">
                Sin gestor
              </Badge>
            ),
          },
          // El backend da el código (SUPERADA, PERSISTE…): se muestra su nombre del catálogo.
          {
            etiqueta: "Último seguimiento",
            valor: resultados.find((r) => r.codigo === caso.ultimo_seguimiento)?.label ?? caso.ultimo_seguimiento,
          },
          {
            etiqueta: "Registro vinculado",
            valor: caso.registro_vinculado_tipo ? `${caso.registro_vinculado_tipo} #${caso.registro_vinculado_id ?? ""}` : "",
          },
          {
            etiqueta: "Anotaciones de origen",
            ancho: true,
            valor: caso.anotaciones_origen?.length ? (
              <ul className="flex flex-col gap-1">
                {caso.anotaciones_origen.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">{formatFecha(a.fecha)}</span>
                    <span>
                      <span className="font-semibold">{a.codigo}</span> · {a.descripcion}
                    </span>
                    <span className="text-muted-foreground">— {a.estudiante}</span>
                    {a.anulada && (
                      <Badge variant="soft" color="muted">
                        Anulada
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              ""
            ),
          },
          {
            etiqueta: "Descripción de los hechos",
            ancho: true,
            valor: <span className="whitespace-pre-line">{caso.descripcion}</span>,
          },
        ]}
      />
    </SeccionPlegable>
  )
}
