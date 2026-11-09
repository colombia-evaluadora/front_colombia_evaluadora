import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

import { IconoCarga } from "@/features/gestion-estudiantil/components/icono-carga"
import { useAtiendenQuery } from "@/features/gestion-estudiantil/citaciones/api/query/use-atienden-query"
import type { OrigenManual } from "@/features/gestion-estudiantil/citaciones/api/types"
import { CampoAcudiente } from "@/features/gestion-estudiantil/citaciones/components/campo-acudiente"
import { CampoOrigen } from "@/features/gestion-estudiantil/citaciones/components/campo-origen"
import { CampoEstudiante } from "@/features/gestion-estudiantil/citaciones/components/campo-estudiante"
import { useCitacionForm } from "@/features/gestion-estudiantil/citaciones/hooks/use-citacion-form"
import { MOTIVOS_SOLO_SISTEMA } from "@/features/gestion-estudiantil/citaciones/utils/formularios"
import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"

function CitacionForm({ origen, matricula, estudiante }: { origen?: OrigenManual; matricula?: number; estudiante?: string }) {
  const { v, set, nombre, setNombre, errores, guardando, guardar, volver } = useCitacionForm(origen, matricula, estudiante)
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
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" color="neutral" onClick={volver} disabled={guardando}>
                Cancelar
              </Button>
              <Button size="sm" onClick={guardar} disabled={guardando}>
                <IconoCarga cargando={guardando}>
                  <FloppyDiskIcon data-icon="inline-start" />
                </IconoCarga>
                Guardar
              </Button>
            </div>
          }
        >
          Citaciones y compromisos › Nueva citación
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-5 pb-6">
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
            <CampoEstudiante
              id="citacion-estudiante"
              value={v.matricula}
              nombre={nombre}
              error={errores.matricula}
              soloLectura={matricula != null && origen?.tipo === "ANOTACION"}
              onChange={(matricula, n) => {
                setNombre(n)
                // Los candidatos dependen del establecimiento del estudiante: la elección anterior ya no vale.
                set({ matricula, atiende: "" })
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
            {origen && <CampoOrigen id="citacion-origen" origen={origen} />}
          </div>

          <TextoLargo
            id="citacion-texto"
            label="Texto para el acudiente"
            required
            max={1000}
            value={v.texto}
            error={errores.texto}
            onChange={(texto) => set({ texto })}
          />

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
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
          </div>

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
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

          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}

/** Nueva citación (G.3.CIT.4, Gestión Estudiantil 4.1): nace Programada y avisa al acudiente. */
export function CitacionFormPage({
  origen,
  matricula,
  estudiante,
}: {
  origen?: OrigenManual
  matricula?: number
  estudiante?: string
}) {
  return (
    <NoticeProvider>
      <TableScreen>
        <CitacionForm key={origen ? `${origen.tipo}-${origen.id}` : "libre"} origen={origen} matricula={matricula} estudiante={estudiante} />
      </TableScreen>
    </NoticeProvider>
  )
}
