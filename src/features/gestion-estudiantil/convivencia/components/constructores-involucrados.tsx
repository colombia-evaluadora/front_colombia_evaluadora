import { useState } from "react"

import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { ControlPointIcon } from "@/components/ui/icons"

import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import type { EstudianteFila, InvolucradoFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { involucradoVacio } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { DialogAgregarEstudiante } from "@/features/gestion-estudiantil/convivencia/components/involucrados/dialog-agregar-estudiante"
import { FilaEstudiante } from "@/features/gestion-estudiantil/convivencia/components/involucrados/fila-estudiante"
import { FilaOtroInvolucrado } from "@/features/gestion-estudiantil/convivencia/components/involucrados/fila-otro-involucrado"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"

interface ConstructoresProps {
  estudiantes: EstudianteFila[]
  onEstudiantes: (v: EstudianteFila[]) => void
  involucrados: InvolucradoFila[]
  onInvolucrados: (v: InvolucradoFila[]) => void
  errorEstudiantes?: string
  errorInvolucrados?: string
  mostrarErrores: boolean
  /** Caso que se modifica; ausente en el alta. Acota el combo de funcionarios. */
  casoId?: number
}

/** «Estudiantes involucrados (N)» y «Otros involucrados (N)» en un mismo recuadro (G.2.CAS.NUE.1). */
export function ConstructoresInvolucrados({
  estudiantes,
  onEstudiantes,
  involucrados,
  onInvolucrados,
  errorEstudiantes,
  errorInvolucrados,
  mostrarErrores,
  casoId,
}: ConstructoresProps) {
  const roles = useCatalogo("ROL_SITUACION")
  const tipos = useCatalogo("TIPO_INVOLUCRADO")
  const tiposDoc = useCatalogo("TIPO_DOCUMENTO")
  const [agregando, setAgregando] = useState(false)
  const contexto = { casoId: casoId ?? null, matricula: casoId == null ? (estudiantes[0]?.fk_matricula ?? null) : null }
  const setInv = (i: number, patch: Partial<InvolucradoFila>) =>
    onInvolucrados(involucrados.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  return (
    <div className="flex flex-col gap-2">
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
        <SeccionPlegable
          titulo={`Estudiantes involucrados (${estudiantes.length})*`}
          forzarAbierta={mostrarErrores && (Boolean(errorEstudiantes) || estudiantes.some((e) => !e.rol))}
          accion={
            <Button type="button" size="sm" variant="outline" onClick={() => setAgregando(true)}>
              <ControlPointIcon data-icon="inline-start" />
              Agregar estudiante
            </Button>
          }
        >
          {estudiantes.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Aún no hay estudiantes en el caso.</p>
          ) : (
            <ul className="divide-y divide-border">
              {estudiantes.map((e, i) => (
                <FilaEstudiante
                  key={e.fk_matricula}
                  fila={e}
                  roles={roles}
                  mostrarErrores={mostrarErrores}
                  onRol={(rol) => onEstudiantes(estudiantes.map((x, j) => (j === i ? { ...x, rol } : x)))}
                  onQuitar={() => onEstudiantes(estudiantes.filter((_, j) => j !== i))}
                />
              ))}
            </ul>
          )}
        </SeccionPlegable>

        <SeccionPlegable
          titulo={`Otros involucrados (${involucrados.length})`}
          forzarAbierta={mostrarErrores && Boolean(errorInvolucrados)}
          accion={
            <Button type="button" size="sm" variant="outline" onClick={() => onInvolucrados([...involucrados, involucradoVacio()])}>
              <ControlPointIcon data-icon="inline-start" />
              Agregar otro involucrado
            </Button>
          }
        >
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Adultos o personas externas que participaron en la situación. Información sensible.
            </p>
            {involucrados.map((v, i) => (
              <FilaOtroInvolucrado
                key={v.key}
                fila={v}
                todas={involucrados}
                mostrarErrores={mostrarErrores}
                roles={roles}
                tipos={tipos}
                tiposDoc={tiposDoc}
                contexto={contexto}
                onChange={(patch) => setInv(i, patch)}
                onQuitar={() => onInvolucrados(involucrados.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        </SeccionPlegable>
      </div>
      {errorEstudiantes && <FieldError>{errorEstudiantes}</FieldError>}
      {errorInvolucrados && <FieldError>{errorInvolucrados}</FieldError>}
      <DialogAgregarEstudiante
        open={agregando}
        onOpenChange={setAgregando}
        yaAgregados={estudiantes.map((e) => e.fk_matricula)}
        onAgregar={(fila) => onEstudiantes([...estudiantes, fila])}
      />
    </div>
  )
}
