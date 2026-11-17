import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { CamposRazones } from "@/features/gestion-estudiantil/reintegracion/components/campos-razones"
import type { useAbrirCasoForm } from "@/features/gestion-estudiantil/reintegracion/hooks/use-abrir-caso-form"
import { MOTIVO_APERTURA_MAX } from "@/features/gestion-estudiantil/reintegracion/utils/razones"

const hoy = () => new Date().toISOString().slice(0, 10)

/** Campos de «Abrir caso» (G.9.ABR.1). Origen y Fecha de apertura son de solo lectura: los fija el sistema. */
export function FormularioAbrirCaso({ f }: { f: ReturnType<typeof useAbrirCasoForm> }) {
  return (
    <div className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <ErrorNoticeBanner error={f.errorBackend} />
      </div>
      <div className="sm:col-span-2">
        <ComboOpciones
          id="reintegracion-abrir-estudiante"
          label="Estudiante"
          required
          size="default"
          todos={false}
          disabled={f.sinEstablecimiento}
          placeholder={f.sinEstablecimiento ? "No hay sedes en su alcance" : "Buscar estudiante"}
          value={f.matricula}
          options={f.matriculaOpciones}
          error={f.error("matricula")}
          onInputChange={f.onBuscarMatricula}
          onChange={f.elegirMatricula}
        />
      </div>
      <Field orientation="vertical" variant="outlined" className="gap-2">
        <FieldLabel htmlFor="reintegracion-abrir-origen">Origen</FieldLabel>
        <Input id="reintegracion-abrir-origen" value="Apertura manual" readOnly disabled />
      </Field>
      <Field orientation="vertical" variant="outlined" className="gap-2">
        <FieldLabel htmlFor="reintegracion-abrir-fecha">Fecha de apertura</FieldLabel>
        <Input id="reintegracion-abrir-fecha" value={formatFecha(hoy())} readOnly disabled />
      </Field>
      <div className="sm:col-span-2">
        <TextoLargo
          id="reintegracion-abrir-motivo"
          label="Motivo de apertura"
          required
          rows={4}
          max={MOTIVO_APERTURA_MAX}
          value={f.motivo}
          error={f.error("motivo")}
          onChange={f.setMotivo}
        />
      </div>
      <div className="flex flex-col gap-1">
        <ComboOpciones
          id="reintegracion-abrir-profesional"
          label="Profesional de trabajo social"
          size="default"
          todos="Sin asignar"
          disabled={!f.matricula}
          placeholder={f.matricula ? "Sin asignar" : "Elija un estudiante primero"}
          value={f.profesional}
          options={f.profesionalOpciones}
          onChange={f.setProfesional}
        />
        <p className="text-xs text-muted-foreground">
          Con rol Profesional de trabajo social activo en la Sede y Jornada de la matrícula.
        </p>
      </div>
      <Field orientation="vertical" variant="plain" className="gap-1 self-start">
        <label className="flex h-11 items-center gap-3 text-sm">
          <Switch round checked={f.alta} onCheckedChange={f.setAlta} />
          Alta complejidad
        </label>
        <FieldDescription>
          Marcado, el caso pide la validación del Administrador del establecimiento al terminar el Diagnóstico.
        </FieldDescription>
      </Field>
      <div className="sm:col-span-2">
        <SeccionPlegable titulo="Razones del abandono" subtitulo="Opcionales" encuadrada comoSeccion contentClassName="p-4">
          <CamposRazones
            id="reintegracion-abrir"
            opciones={f.razonesOpciones}
            value={f.razones}
            onChange={f.setRazones}
            errorOtraRazon={f.error("otraRazon")}
          />
        </SeccionPlegable>
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">Los campos marcados con * son obligatorios</p>
    </div>
  )
}
