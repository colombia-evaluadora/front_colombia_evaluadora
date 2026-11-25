import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { paths } from "@/config/paths"

import { nombreDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { COLOR_ESTADO_PROCESO } from "@/features/gestion-estudiantil/convivencia/api/procesos-ui"
import type { EstadoProcesoCodigo } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
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
          {caso.registro_vinculado ? (
            // F24: el registro de origen, con la etiqueta que da el backend y enlace a su detalle.
            <Link
              to={
                caso.registro_vinculado.tipo === "CASO_REINTEGRACION"
                  ? paths.app.reintegracionCaso.getHref(caso.registro_vinculado.id)
                  : paths.app.prevencionPlanDetalle.getHref(caso.registro_vinculado.id)
              }
              className="text-primary hover:underline"
            >
              {[
                caso.registro_vinculado.tipo_nombre,
                caso.registro_vinculado.estudiante_nombre,
                caso.registro_vinculado.fecha && formatFecha(caso.registro_vinculado.fecha),
              ]
                .filter(Boolean)
                .join(" · ")}
            </Link>
          ) : caso.registro_vinculado_tipo ? (
            `${caso.registro_vinculado_tipo} #${caso.registro_vinculado_id ?? ""}`
          ) : (
            ""
          )}
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
                <span className="text-muted-foreground">
                  — {[a.estudiante, a.registrador_nombre].filter(Boolean).join(" · ")}
                </span>
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
      {/* F31: los procesos abiertos desde este caso, con su estado. */}
      {caso.procesos_disciplinarios?.length ? (
        <Dato label="Procesos disciplinarios">
          <ul className="flex flex-col gap-1">
            {caso.procesos_disciplinarios.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2">
                <Link to={paths.app.convivenciaProceso.getHref(p.id)} className="text-primary hover:underline">
                  {[p.numero, p.estudiante].filter(Boolean).join(" · ")}
                </Link>
                {p.estado_nombre && (
                  <Badge variant="soft" color={COLOR_ESTADO_PROCESO[p.estado_codigo as EstadoProcesoCodigo] ?? "muted"}>
                    {p.estado_nombre}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </Dato>
      ) : null}
      <Dato label="Descripción de los hechos">
        <span className="whitespace-pre-wrap">{caso.descripcion}</span>
      </Dato>
    </SeccionPlegable>
  )
}
