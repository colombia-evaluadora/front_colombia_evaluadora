import { Badge } from "@/components/ui/badge"

import { nombreDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { fechaHechosTexto } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"

/** «Datos del caso»: fechas, catálogos, reporte, gestor, anotaciones de origen y descripción. */
export function SeccionDatosCasoDetalle({ caso }: { caso: CasoDetalle }) {
  const manifestaciones = useCatalogo("MANIFESTACION_SITUACION")
  const lugares = useCatalogo("LUGAR_SITUACION")
  const resultados = useCatalogo("RESULTADO_SEGUIMIENTO")
  const { fecha, hora } = fechaHechosTexto(caso)
  return (
    <SeccionPlegable encuadrada comoSeccion titulo="Datos del caso" contentClassName="flex flex-col gap-3 px-4 py-4">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Dato label="Fecha de los hechos">{hora ? `${fecha} · ${hora}` : fecha}</Dato>
        <Dato label="Fecha de conocimiento">{formatFecha(caso.fecha_conocimiento)}</Dato>
        <Dato label="Manifestación">{nombreDe(manifestaciones, caso.fk_tlv_manifestacion)}</Dato>
        <Dato label="Lugar">{nombreDe(lugares, caso.fk_tlv_lugar)}</Dato>
        <Dato label="Reportado por">{caso.reporta_nombre}</Dato>
        <Dato label="Gestor">
          {caso.fk_funcionario_gestor ? (
            caso.gestor_nombre
          ) : (
            <Badge variant="soft" color="warning">
              Sin gestor
            </Badge>
          )}
        </Dato>
        {/* El backend da el código (SUPERADA, PERSISTE…): se muestra su nombre del catálogo. */}
        <Dato label="Último seguimiento">
          {resultados.find((r) => r.codigo === caso.ultimo_seguimiento)?.label ?? caso.ultimo_seguimiento}
        </Dato>
        <Dato label="Registro vinculado">
          {caso.registro_vinculado_tipo ? `${caso.registro_vinculado_tipo} #${caso.registro_vinculado_id ?? ""}` : ""}
        </Dato>
      </dl>
      <Dato label="Anotaciones de origen">
        {caso.anotaciones_origen?.length ? (
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
        )}
      </Dato>
      <Dato label="Descripción de los hechos">
        <span className="whitespace-pre-wrap">{caso.descripcion}</span>
      </Dato>
    </SeccionPlegable>
  )
}
