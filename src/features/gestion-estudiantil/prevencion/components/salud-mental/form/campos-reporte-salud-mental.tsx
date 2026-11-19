import { DatePicker } from "@/components/date-picker";
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones";
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo";
import type { useReporteSaludMentalForm } from "@/features/gestion-estudiantil/prevencion/hooks/use-reporte-salud-mental-form";
import { OBSERVADO_MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios-salud-mental";

/** Campos del reporte de salud mental: estudiante, fecha, tipo de señal y lo observado (sin detalle clínico). */
export function CamposReporteSaludMental({
  f,
}: {
  f: ReturnType<typeof useReporteSaludMentalForm>;
}) {
  const { selector } = f;
  return (
    <div className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-3">
      <div className="sm:col-span-3">
        <ErrorNoticeBanner error={f.errorBackend} />
      </div>
      <div className="sm:col-span-3">
        <ComboOpciones
          id="senal-estudiante"
          label="Estudiante"
          required
          size="default"
          todos={false}
          placeholder="Buscar estudiante"
          value={selector.estudiante}
          options={selector.opciones}
          error={f.error("estudiante")}
          onInputChange={selector.onBuscar}
          onChange={selector.elegir}
        />
      </div>
      <Field
        orientation="vertical"
        variant="outlined"
        className="gap-2"
        data-invalid={Boolean(f.error("fecha")) || undefined}
      >
        <FieldLabel htmlFor="senal-fecha">Fecha*</FieldLabel>
        <DatePicker
          id="senal-fecha"
          value={f.fecha}
          maxDate={new Date()}
          aria-invalid={Boolean(f.error("fecha")) || undefined}
          onChange={f.setFecha}
        />
        {f.error("fecha") && <FieldError>{f.error("fecha")}</FieldError>}
      </Field>
      <ComboOpciones
        id="senal-tipo"
        label="Tipo de señal"
        required
        size="default"
        todos={false}
        placeholder="Seleccione"
        value={f.tipo}
        options={f.tipoOpciones}
        error={f.error("tipo")}
        onChange={f.setTipo}
      />
      <div className="sm:col-span-3">
        <TextoLargo
          id="senal-observado"
          label="Lo observado"
          required
          max={OBSERVADO_MAX}
          rows={5}
          placeholder="Describa solo lo que vio u oyó, sin diagnósticos."
          value={f.observado}
          error={f.error("observado")}
          onChange={f.setObservado}
        />
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-3">
        Los campos marcados con * son obligatorios
      </p>
    </div>
  );
}
