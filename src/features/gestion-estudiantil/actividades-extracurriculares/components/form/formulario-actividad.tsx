import { DatePicker } from "@/components/date-picker"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { LockIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { ESTADOS_ACTIVIDAD_FILTRO } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/ui-mappings"
import { CampoGrados } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/form/campo-grados"
import {
  DESCRIPCION_MAX,
  EXTERNO_MAX,
  HORARIO_MAX,
  NOMBRE_MAX,
  type ActividadForm,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/hooks/use-actividad-form"
import type { EstadoActividad } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

/** Campo de texto con etiqueta, contador opcional y ayuda (Field outlined). */
function CampoTexto({
  id,
  label,
  value,
  onChange,
  max,
  required,
  contador,
  placeholder,
  ayuda,
  error,
  inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  max?: number
  required?: boolean
  contador?: boolean
  placeholder?: string
  ayuda?: string
  error?: string
  inputMode?: "numeric"
}) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && "*"}
      </FieldLabel>
      <Input
        id={id}
        value={value}
        maxLength={max}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={Boolean(error) || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {(error || ayuda || (contador && max)) && (
        <div className="flex justify-between gap-2">
          {error ? <FieldError>{error}</FieldError> : ayuda ? <FieldDescription>{ayuda}</FieldDescription> : <span />}
          {contador && max ? <CharacterCounter value={value} max={max} /> : null}
        </div>
      )}
    </Field>
  )
}

function CampoFecha({
  id,
  label,
  value,
  onChange,
  minDate,
  error,
}: {
  id: string
  label: string
  value: Date | undefined
  onChange: (v: Date | undefined) => void
  minDate?: Date
  error?: string
}) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{label}*</FieldLabel>
      <DatePicker id={id} value={value} minDate={minDate} aria-invalid={Boolean(error) || undefined} onChange={onChange} />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

/**
 * Campos de la actividad (G.5.ACT.NUE). Al modificar, Sede, Jornada y Período van bloqueados y no hay Estado
 * (se cambia con Activar/Inactivar). Entidad y Supervisor externos solo existen en Servicio social.
 */
export function FormularioActividad({ f }: { f: ActividadForm }) {
  const sinSedeJornada = !f.sede || !f.jornada
  return (
    <div className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-6">
      <div className="sm:col-span-6">
        <ErrorNoticeBanner error={f.errorBackend} />
      </div>

      <div className="sm:col-span-4">
        <CampoTexto
          id="actividad-nombre"
          label="Nombre"
          required
          contador
          max={NOMBRE_MAX}
          value={f.nombre}
          error={f.error("nombre")}
          onChange={f.setNombre}
        />
      </div>
      <div className="sm:col-span-2">
        <ComboOpciones
          id="actividad-tipo"
          label="Tipo de actividad"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={f.tipo}
          options={f.tipoOpciones}
          error={f.error("tipo")}
          onChange={f.elegirTipo}
        />
      </div>

      <div className="sm:col-span-2">
        <ComboOpciones
          id="actividad-sede"
          label="Sede educativa"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          disabled={f.edicion}
          value={f.sede}
          options={f.sedeOpciones}
          error={f.error("sede")}
          onChange={f.elegirSede}
        />
      </div>
      <div className="sm:col-span-2">
        <ComboOpciones
          id="actividad-jornada"
          label="Jornada"
          required
          size="default"
          todos={false}
          disabled={f.edicion || !f.sede}
          placeholder={f.sede ? "Seleccione" : "Elija una sede primero"}
          value={f.jornada}
          options={f.jornadaOpciones}
          error={f.error("jornada")}
          onChange={f.elegirJornada}
        />
      </div>
      <div className="sm:col-span-2">
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="actividad-periodo">Período académico</FieldLabel>
          <Input
            id="actividad-periodo"
            value={f.periodoNombre ?? (f.jornada ? "Sin período vigente" : "Se toma de la jornada")}
            readOnly
            disabled
          />
        </Field>
      </div>

      <div className="sm:col-span-6">
        <ComboOpciones
          id="actividad-responsable"
          label="Responsable"
          required
          size="default"
          todos={false}
          disabled={sinSedeJornada}
          placeholder={sinSedeJornada ? "Elija sede y jornada primero" : "Seleccione"}
          value={f.responsable}
          options={f.responsableOpciones}
          error={f.error("responsable")}
          onChange={f.setResponsable}
        />
      </div>

      <div className="sm:col-span-3">
        <CampoFecha id="actividad-inicio" label="Fecha de inicio" value={f.inicio} error={f.error("inicio")} onChange={f.setInicio} />
      </div>
      <div className="sm:col-span-3">
        <CampoFecha
          id="actividad-fin"
          label="Fecha de fin"
          value={f.fin}
          minDate={f.inicio}
          error={f.error("fin")}
          onChange={f.setFin}
        />
      </div>

      <div className="sm:col-span-4">
        <CampoTexto
          id="actividad-horario"
          label="Horario"
          max={HORARIO_MAX}
          value={f.horario}
          ayuda={'P. ej. "Martes y jueves, 2:00 a 4:00 p. m."'}
          onChange={f.setHorario}
        />
      </div>
      <div className="sm:col-span-2">
        <CampoTexto
          id="actividad-cupo"
          label="Cupo"
          inputMode="numeric"
          value={f.cupo}
          ayuda="Vacío, sin límite."
          error={f.error("cupo")}
          onChange={(v) => f.setCupo(v.replace(/\D/g, ""))}
        />
      </div>

      <div className="sm:col-span-4">
        <CampoGrados
          id="actividad-grados"
          opciones={f.gradoOpciones}
          value={f.grados}
          disabled={sinSedeJornada}
          placeholder={sinSedeJornada ? "Elija sede y jornada primero" : "Seleccione"}
          ayuda={f.esServicioSocial ? "Solo los Grados del servicio social." : "Grados del Período Académico."}
          error={f.error("grados")}
          onChange={f.setGrados}
        />
      </div>
      <div className="sm:col-span-2">
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="actividad-asistencia">Registra asistencia*</FieldLabel>
          <label className="flex h-11 items-center gap-3 text-sm">
            <Switch
              id="actividad-asistencia"
              round
              checked={f.registraAsistencia}
              disabled={f.esServicioSocial}
              onCheckedChange={f.setRegistraAsistencia}
            />
            {f.registraAsistencia ? "Sí" : "No"}
            {f.esServicioSocial && <LockIcon className="size-4 text-muted-foreground" aria-hidden />}
          </label>
          <FieldDescription>Obligatorio en Servicio social.</FieldDescription>
        </Field>
      </div>

      {f.esServicioSocial && (
        <>
          <div className="sm:col-span-3">
            <CampoTexto
              id="actividad-entidad"
              label="Entidad externa"
              max={EXTERNO_MAX}
              placeholder="P. ej. Hospital San Rafael"
              value={f.entidad}
              ayuda="Solo si el servicio se presta fuera del establecimiento."
              onChange={f.setEntidad}
            />
          </div>
          <div className="sm:col-span-3">
            <CampoTexto
              id="actividad-supervisor"
              label="Supervisor externo"
              required={Boolean(f.entidad.trim())}
              max={EXTERNO_MAX}
              placeholder="Nombre y cargo"
              value={f.supervisor}
              ayuda="Solo si el servicio se presta fuera del establecimiento."
              error={f.error("supervisor")}
              onChange={f.setSupervisor}
            />
          </div>
        </>
      )}

      {!f.edicion && (
        <div className="sm:col-span-2">
          <ComboOpciones
            id="actividad-estado"
            label="Estado"
            required
            size="default"
            todos={false}
            value={f.estado}
            options={ESTADOS_ACTIVIDAD_FILTRO}
            onChange={(v) => f.setEstado(v as EstadoActividad)}
          />
        </div>
      )}

      <div className="sm:col-span-6">
        <TextoLargo
          id="actividad-descripcion"
          label="Descripción"
          rows={3}
          max={DESCRIPCION_MAX}
          value={f.descripcion}
          onChange={f.setDescripcion}
        />
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-6">Los campos marcados con * son obligatorios</p>
    </div>
  )
}
