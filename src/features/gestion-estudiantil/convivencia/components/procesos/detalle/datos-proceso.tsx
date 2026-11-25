import { Link } from "@tanstack/react-router"

import { FichaDatos } from "@/components/ficha-datos"
import { Badge } from "@/components/ui/badge"
import { paths } from "@/config/paths"

import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { abreviarPersona } from "@/features/gestion-estudiantil/commons/utils/formatos"

/** Datos generales: estudiante, acudiente, responsable, y vínculos a las anotaciones y al caso de origen. */
export function DatosProceso({ proceso: p }: { proceso: ProcesoDetalle }) {
  return (
    <SeccionPlegable encuadrada comoSeccion titulo="Datos del proceso" contentClassName="flex flex-col gap-4 px-4 py-4">
      <FichaDatos
        datos={[
          { etiqueta: "Estudiante", valor: p.estudiante.nombre },
          { etiqueta: "Grado/Grupo", valor: p.estudiante.grado_grupo },
          { etiqueta: "Sede", valor: p.estudiante.sede_nombre },
          { etiqueta: "Jornada", valor: p.estudiante.jornada_nombre },
          {
            etiqueta: "Acudiente",
            valor: p.acudiente ? (
              <span className="flex flex-wrap items-center gap-2">
                {p.acudiente.nombre}
                {!p.acudiente.tiene_cuenta && (
                  <Badge variant="soft" color="warning">
                    Sin cuenta
                  </Badge>
                )}
              </span>
            ) : (
              ""
            ),
          },
          { etiqueta: "Responsable", valor: abreviarPersona(p.responsable) },
          { etiqueta: "Abierto por", valor: abreviarPersona(p.abre) },
          { etiqueta: "Fecha de apertura", valor: formatFecha(p.fecha_apertura) },
          {
            etiqueta: "Origen",
            ancho: true,
            valor: (
              <ul className="flex flex-col gap-1">
                {p.origen.anotaciones.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">{formatFecha(a.fecha)}</span>
                    <span>
                      Anotación <span className="font-semibold">{a.codigo}</span> · {a.codigo_descripcion}
                    </span>
                    {a.anulada && (
                      <Badge variant="soft" color="muted">
                        Anulada
                      </Badge>
                    )}
                  </li>
                ))}
                {p.origen.caso && (
                  <li className="flex flex-wrap items-center gap-2">
                    <Link to={paths.app.convivenciaCaso.getHref(p.origen.caso.id)} className="underline underline-offset-3">
                      Caso {p.origen.caso.numero}
                    </Link>
                    <span className="text-muted-foreground">· hechos del {formatFecha(p.origen.caso.fecha_hechos)}</span>
                  </li>
                )}
              </ul>
            ),
          },
        ]}
      />
    </SeccionPlegable>
  )
}
