import { Button } from "@/components/ui/button"
import { GraduationCapIcon } from "@/components/ui/icons"

import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { CampoFecha } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-fecha"
import { CampoLista } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-lista"
import { TrayectoriaCalculadaBloque } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/trayectoria-calculada"
import { CampoTexto } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campo-texto"
import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"
import { useEntradaHistorialAcademico } from "@/features/gestion-estudiantil/prevencion/hooks/use-entrada-historial-academico"
import { codigoDeOpcion, CODIGO, MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios-caracterizacion"

const digitos = (t: string, largo: number) => t.replace(/\D/g, "").slice(0, largo)

/** Trayectoria escolar: lo declarado (editable) y lo calculado desde Cobertura, Gestión Académica y Convivencia (solo lectura). */
export function SeccionTrayectoria({ f }: { f: FormularioCaracterizacion }) {
  const { v, set, listas } = f
  const calculada = f.detalle.trayectoria.calculada
  const cursoSi = codigoDeOpcion(listas.RESPUESTA_ACOMPANAMIENTO, v.cursoPreescolar) === CODIGO.si
  const dificultadesSi = codigoDeOpcion(listas.RESPUESTA_ACOMPANAMIENTO, v.dificultades) === CODIGO.si
  const anioAnterior = f.detalle.anio - 1
  const historialAcademico = useEntradaHistorialAcademico(f.detalle.fk_tmatricula)

  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo="Trayectoria escolar"
      forzarAbierta={f.seccionConError("trayectoria")}
      contentClassName="flex flex-col gap-4 px-4 py-4"
    >
      <p className="text-sm text-muted-foreground">
        Solo lo que la plataforma no tiene: la repitencia, la asistencia, las asignaturas reprobadas y los antecedentes
        disciplinarios salen de Cobertura Educativa, Gestión Académica y Convivencia.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CampoLista
          id="trayectoria-curso-preescolar"
          label="Cursó preescolar"
          required
          opciones={listas.RESPUESTA_ACOMPANAMIENTO}
          value={v.cursoPreescolar}
          disabled={f.lectura}
          error={f.error("trayectoria-curso-preescolar")}
          onChange={(cursoPreescolar) => set({ cursoPreescolar, aniosPreescolar: "" })}
        />
        <CampoTexto
          id="trayectoria-anios-preescolar"
          label="Años de preescolar"
          inputMode="numeric"
          value={v.aniosPreescolar}
          disabled={f.lectura || !cursoSi}
          ayuda="De 1 a 3, solo si cursó preescolar y se conoce."
          error={f.error("trayectoria-anios-preescolar")}
          onChange={(t) => set({ aniosPreescolar: digitos(t, 1) })}
        />
        <CampoTexto
          id="trayectoria-retiros"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Retiros sin terminar el año"
          inputMode="numeric"
          value={v.retiros}
          disabled={f.lectura}
          ayuda="Antes de llegar a la plataforma."
          error={f.error("trayectoria-retiros")}
          onChange={(t) => set({ retiros: digitos(t, 2) })}
        />
        <CampoTexto
          id="trayectoria-interrupciones"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Interrupciones temporales de asistencia"
          inputMode="numeric"
          value={v.interrupciones}
          disabled={f.lectura}
          ayuda="Antes de llegar a la plataforma."
          error={f.error("trayectoria-interrupciones")}
          onChange={(t) => set({ interrupciones: digitos(t, 2) })}
        />
        <CampoTexto
          id="trayectoria-meses"
          label="Meses fuera del sistema educativo"
          inputMode="numeric"
          value={v.meses}
          disabled={f.lectura}
          error={f.error("trayectoria-meses")}
          onChange={(t) => set({ meses: digitos(t, 3) })}
        />
        <CampoTexto
          id="trayectoria-fuente"
          label="Fuente de estos conteos"
          max={MAX.fuente}
          value={v.trayectoriaFuente}
          disabled={f.lectura}
          onChange={(trayectoriaFuente) => set({ trayectoriaFuente })}
        />
        <CampoFecha
          id="trayectoria-fecha-referencia"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Fecha de referencia de estos conteos"
          value={v.trayectoriaFecha}
          disabled={f.lectura}
          onChange={(trayectoriaFecha) => set({ trayectoriaFecha })}
        />
      </div>

      {!calculada.matricula_anio_anterior && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CampoTexto
            id="trayectoria-asistencia-pct"
            label="Asistencia del año anterior (%)"
            inputMode="numeric"
            value={v.asistenciaPct}
            disabled={f.lectura}
            ayuda={`Solo si en ${anioAnterior} no estuvo matriculado en la plataforma.`}
            error={f.error("trayectoria-asistencia-pct")}
            onChange={(t) => set({ asistenciaPct: digitos(t, 3) })}
          />
          <CampoTexto
            id="trayectoria-asistencia-periodo"
            label="Año o período de esa asistencia"
            max={MAX.periodoAsistencia}
            value={v.asistenciaPeriodo}
            disabled={f.lectura}
            error={f.error("trayectoria-asistencia-periodo")}
            onChange={(asistenciaPeriodo) => set({ asistenciaPeriodo })}
          />
          <CampoTexto
            id="trayectoria-asistencia-institucion"
            label="Institución"
            max={MAX.institucionAsistencia}
            value={v.asistenciaInstitucion}
            disabled={f.lectura}
            error={f.error("trayectoria-asistencia-institucion")}
            onChange={(asistenciaInstitucion) => set({ asistenciaInstitucion })}
          />
          <CampoTexto
            id="trayectoria-asistencia-fuente"
            label="Fuente"
            max={MAX.fuente}
            value={v.asistenciaFuente}
            disabled={f.lectura}
            error={f.error("trayectoria-asistencia-fuente")}
            onChange={(asistenciaFuente) => set({ asistenciaFuente })}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CampoLista
          id="trayectoria-dificultades"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Dificultades de aprendizaje diagnosticadas"
          required
          opciones={listas.RESPUESTA_ACOMPANAMIENTO}
          value={v.dificultades}
          disabled={f.lectura}
          error={f.error("trayectoria-dificultades")}
          onChange={(dificultades) => set({ dificultades })}
        />
        <div className="lg:col-span-2">
          <CampoTexto
            id="trayectoria-dificultades-cuales"
            label="Cuáles"
            required={dificultadesSi}
            max={MAX.dificultadesCuales}
            value={v.dificultadesCuales}
            disabled={f.lectura}
            error={f.error("trayectoria-dificultades-cuales")}
            onChange={(dificultadesCuales) => set({ dificultadesCuales })}
          />
        </div>
        <CampoTexto
          id="trayectoria-dificultades-fuente"
          label="Fuente del diagnóstico"
          max={MAX.fuente}
          value={v.dificultadesFuente}
          disabled={f.lectura}
          onChange={(dificultadesFuente) => set({ dificultadesFuente })}
        />
        <CampoFecha
          id="trayectoria-dificultades-fecha"
          label="Fecha del diagnóstico"
          value={v.dificultadesFecha}
          disabled={f.lectura}
          onChange={(dificultadesFecha) => set({ dificultadesFecha })}
        />
        <div className="lg:col-span-2 xl:col-span-3">
          <TextoLargo
            id="trayectoria-causas-repitencia"
            label="Causas de la repitencia"
            required={calculada.repitente === true}
            max={MAX.causasRepitencia}
            rows={2}
            value={v.causasRepitencia}
            disabled={f.lectura}
            error={f.error("trayectoria-causas-repitencia")}
            onChange={(causasRepitencia) => set({ causasRepitencia })}
          />
        </div>
      </div>

      <TrayectoriaCalculadaBloque c={calculada} />
      <div>
        {/* Navegar con el formulario en edición perdería lo digitado: la acción se ofrece en la vista de lectura. */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!historialAcademico.habilitada || !f.vista}
          onClick={historialAcademico.abrir}
        >
          <GraduationCapIcon data-icon="inline-start" />
          Consultar historial académico
        </Button>
      </div>
    </SeccionPlegable>
  )
}
