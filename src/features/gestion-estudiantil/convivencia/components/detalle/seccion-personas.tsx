import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"

/** «Estudiantes involucrados» y, si hay, «Otros involucrados». */
export function SeccionPersonas({ caso }: { caso: CasoDetalle }) {
  return (
    <>
      <SeccionPlegable encuadrada comoSeccion titulo={`Estudiantes involucrados (${caso.estudiantes?.length ?? 0})`}>
        <ul className="flex flex-col divide-y divide-border">
          {(caso.estudiantes ?? []).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <span>
                <span className="font-medium">{e.nombre}</span>
                {e.grado_grupo && <span className="text-muted-foreground"> · {e.grado_grupo}</span>}
              </span>
              <span>{e.rol_nombre}</span>
            </li>
          ))}
        </ul>
      </SeccionPlegable>

      {caso.otros_involucrados && caso.otros_involucrados.length > 0 && (
        <SeccionPlegable
          encuadrada
          comoSeccion
          defaultAbierta={false}
          titulo={`Otros involucrados (${caso.otros_involucrados.length})`}
        >
          <ul className="flex flex-col divide-y divide-border">
            {caso.otros_involucrados.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{i.nombre}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {i.tipo_nombre}
                    {i.numero_documento && ` · ${i.numero_documento}`}
                  </span>
                </span>
                <span>{i.rol_nombre}</span>
              </li>
            ))}
          </ul>
        </SeccionPlegable>
      )}
    </>
  )
}
