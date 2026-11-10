import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ControlPointIcon } from "@/components/ui/icons"

import type { EstudianteFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { useAgregarEstudiante } from "@/features/gestion-estudiantil/convivencia/hooks/use-agregar-estudiante"

/** Diálogo «Agregar estudiante»: cascada Sede → Jornada → Grado/Grupo → Estudiante (padrón /planeador/estudiantes). */
export function DialogAgregarEstudiante({
  open,
  onOpenChange,
  yaAgregados,
  onAgregar,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  yaAgregados: number[]
  onAgregar: (fila: EstudianteFila) => void
}) {
  const s = useAgregarEstudiante({ yaAgregados, onAgregar, onOpenChange })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar estudiante</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ComboOpciones
            id="est-sede"
            label="Sede"
            size="default"
            todos={false}
            value={s.sede}
            options={s.opciones.sedeOpciones}
            onChange={s.elegirSede}
          />
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            <ComboOpciones
              id="est-jornada"
              label="Jornada"
              size="default"
              todos={false}
              disabled={!s.sede}
              value={s.jornada}
              options={s.opciones.jornadaOpciones}
              onChange={s.elegirJornada}
            />
            <ComboOpciones
              id="est-grupo"
              label="Grado/Grupo"
              size="default"
              todos={false}
              disabled={!s.jornada}
              value={s.grupo}
              options={s.opciones.grupoOpciones}
              onChange={s.elegirGrupo}
            />
          </div>
          <ComboOpciones
            id="est-estudiante"
            label="Estudiante"
            required
            size="default"
            todos={false}
            disabled={!s.grupo}
            placeholder={s.grupo ? (s.cargandoRoster ? "Cargando…" : "Buscar estudiante") : "Elegí Grado/Grupo primero"}
            value={s.estudiante}
            options={s.estudianteOpciones}
            error={s.repetido ? "Este estudiante ya está en el caso." : undefined}
            onChange={s.elegirEstudiante}
          />
        </div>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cancelar</DialogClose>
          <Button size="sm" type="button" disabled={!s.estudiante} onClick={s.agregar}>
            <ControlPointIcon data-icon="inline-start" />
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
