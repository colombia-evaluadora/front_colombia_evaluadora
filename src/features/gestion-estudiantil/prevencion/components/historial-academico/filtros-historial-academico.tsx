import { Button } from "@/components/ui/button"
import { MagnifyingGlassIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { CampoCasillas } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-casillas"
import type { useHistorialAcademico } from "@/features/gestion-estudiantil/prevencion/hooks/use-historial-academico"

/**
 * Filtros del historial académico (G.8.HIS.1-3): Año, Matrícula / Período Académico, Asignatura y Períodos de Evaluación.
 * Sin años anteriores (HIS.3) quedan deshabilitados con «Sin años anteriores» / «Seleccione». Las etiquetas largas
 * ocupan celdas más anchas para quedar en una línea.
 */
export function FiltrosHistorialAcademico({ h }: { h: ReturnType<typeof useHistorialAcademico> }) {
  const sin = h.op?.sin_anios_anteriores ?? true
  return (
    <section aria-label="Consultar historial académico" className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <ComboOpciones
          id="historial-academico-anio"
          className="gap-2 xl:col-span-1"
          label="Año"
          required
          size="default"
          todos={false}
          placeholder={sin ? "Sin años anteriores" : "Seleccione"}
          disabled={sin}
          value={h.anio}
          options={h.opcionesAnio}
          onChange={h.elegirAnio}
        />
        <ComboOpciones
          id="historial-academico-matricula"
          className="gap-2 lg:col-span-3 xl:col-span-3"
          label="Matrícula / Período Académico"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          disabled={sin}
          value={h.matriculaId}
          options={h.opcionesMatricula}
          onChange={h.elegirMatricula}
        />
        <div className="flex flex-col gap-1 lg:col-span-2 xl:col-span-2">
          <ComboOpciones
            id="historial-academico-asignatura"
            label="Asignatura"
            required
            size="default"
            todos="Todas"
            placeholder="Seleccione"
            disabled={sin}
            value={h.asignatura}
            options={h.opcionesAsignatura}
            onChange={h.elegirAsignatura}
          />
          <p className="text-xs text-muted-foreground">No usa el plan de estudio actual.</p>
        </div>
      </div>
      {sin ? (
        <ComboOpciones
          id="historial-academico-periodos-vacio"
          className="gap-2 lg:w-1/3"
          label="Períodos de Evaluación"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          disabled
          value=""
          options={[]}
          onChange={() => undefined}
        />
      ) : (
        <CampoCasillas
          id="historial-academico-periodos"
          label="Períodos de Evaluación"
          required
          opciones={h.opcionesPeriodo.map((o) => ({ ...o, codigo: o.value }))}
          value={h.periodos}
          onChange={h.elegirPeriodos}
        />
      )}
      <div className="flex items-center gap-4">
        <Button type="button" size="sm" disabled={sin || !h.puedeConsultar || h.resultadoQuery.isFetching} onClick={h.consultar}>
          <MagnifyingGlassIcon data-icon="inline-start" />
          Consultar
        </Button>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
      </div>
    </section>
  )
}
