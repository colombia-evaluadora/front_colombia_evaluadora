import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

import { useAtiendenQuery } from "@/features/gestion-estudiantil/citaciones/api/query/use-atienden-query"
import type { OrigenManual } from "@/features/gestion-estudiantil/citaciones/api/types"
import { CampoAcudiente } from "@/features/gestion-estudiantil/citaciones/components/campo-acudiente"
import { CampoEstudiante } from "@/features/gestion-estudiantil/citaciones/components/campo-estudiante"
import { CampoOrigen } from "@/features/gestion-estudiantil/citaciones/components/campo-origen"
import { useCitacionForm } from "@/features/gestion-estudiantil/citaciones/hooks/use-citacion-form"
import { MOTIVOS_SOLO_SISTEMA } from "@/features/gestion-estudiantil/citaciones/utils/formularios"
import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"

/** Datos con los que se abre el modal: vacío desde el listado, o con origen desde Convivencia / Observador. */
export interface NuevaCitacionInicial {
  origen?: OrigenManual
  matricula?: number
  estudiante?: string
}

interface Props extends NuevaCitacionInicial {
  onClose: () => void
  onCreada: (mensaje: string) => void
}

/**
 * Nueva citación (G.3.CIT.4, Gestión Estudiantil 4.1) en un modal sobre el listado: nace Programada y avisa
 * al acudiente. Se monta solo mientras está abierto, así cada apertura arranca limpia.
 */
export function DialogNuevaCitacion({ origen, matricula, estudiante, onClose, onCreada }: Props) {
  const { v, set, nombre, setNombre, errores, error, guardando, guardar } = useCitacionForm({
    origen,
    matricula,
    estudiante,
    onCreada,
  })
  // El alta manual no ofrece los motivos que solo genera el sistema (V612).
  const motivos = useCatalogo("MOTIVO_CITACION").filter((m) => !MOTIVOS_SOLO_SISTEMA.includes(m.codigo))
  // Candidatos a atender: funcionarios del establecimiento del estudiante, con búsqueda en el servidor.
  const [busqueda, setBusqueda] = useState("")
  const candidatos = useAtiendenQuery(v.matricula ? Number(v.matricula) : null, busqueda).data ?? []
  const atienden = candidatos.map((f) => ({
    value: String(f.fk_tfuncionario),
    label: [f.nombre, f.cargo_nombre].filter(Boolean).join(" · "),
  }))

  return (
    <DialogoOperacionShell
      titulo="Nueva citación"
      onClose={onClose}
      error={error}
      pending={guardando}
      className="sm:max-w-3xl"
      confirmar={{ label: "Guardar", icon: <FloppyDiskIcon data-icon="inline-start" />, onClick: guardar }}
    >
      <div className="flex flex-col gap-5 pt-2">
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
          <CampoEstudiante
            id="citacion-estudiante"
            value={v.matricula}
            nombre={nombre}
            error={errores.matricula}
            soloLectura={matricula != null && origen?.tipo === "ANOTACION"}
            onChange={(m, n) => {
              setNombre(n)
              // Los candidatos dependen del establecimiento del estudiante: la elección anterior ya no vale.
              set({ matricula: m, atiende: "" })
            }}
          />
          <CampoAcudiente id="citacion-acudiente" matricula={v.matricula} />
          <ComboOpciones
            id="citacion-motivo"
            label="Motivo"
            required
            size="default"
            todos={false}
            placeholder="Seleccione"
            value={v.motivo}
            options={motivos.map((m) => ({ value: m.value, label: m.label }))}
            error={errores.motivo}
            onChange={(motivo) => set({ motivo })}
          />
        </div>

        {origen && <CampoOrigen id="citacion-origen" origen={origen} />}

        <TextoLargo
          id="citacion-texto"
          label="Texto para el acudiente"
          required
          max={1000}
          value={v.texto}
          error={errores.texto}
          onChange={(texto) => set({ texto })}
        />

        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.fecha) || undefined}>
            <FieldLabel htmlFor="citacion-fecha">Fecha y hora*</FieldLabel>
            <DatePicker
              id="citacion-fecha"
              mode="datetime"
              minDate={new Date()}
              value={v.fecha}
              aria-invalid={Boolean(errores.fecha) || undefined}
              onChange={(fecha) => set({ fecha })}
            />
            {errores.fecha && <FieldError>{errores.fecha}</FieldError>}
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.lugar) || undefined}>
            <FieldLabel htmlFor="citacion-lugar">Lugar*</FieldLabel>
            <Input
              id="citacion-lugar"
              maxLength={150}
              value={v.lugar}
              aria-invalid={Boolean(errores.lugar) || undefined}
              onChange={(e) => set({ lugar: e.target.value })}
            />
            <div className="flex justify-between">
              {errores.lugar ? <FieldError>{errores.lugar}</FieldError> : <span />}
              <CharacterCounter value={v.lugar} max={150} />
            </div>
          </Field>
          <div className="flex flex-col gap-1">
            <ComboOpciones
              id="citacion-atiende"
              label="Quién atiende"
              size="default"
              todos="Quien cita"
              placeholder="Quien cita"
              disabled={!v.matricula}
              value={v.atiende}
              options={atienden}
              onChange={(atiende) => set({ atiende })}
              onInputChange={setBusqueda}
            />
            <p className="text-xs text-muted-foreground">Por defecto, quien cita.</p>
          </div>
        </div>
      </div>
    </DialogoOperacionShell>
  )
}
