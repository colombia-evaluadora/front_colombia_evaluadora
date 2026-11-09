import { useMemo, useState } from "react"

import { ClipboardAddIcon } from "@/components/ui/icons"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatDateValue } from "@/lib/date-value"

import { useRegistrarDescargos } from "@/features/gestion-estudiantil/convivencia/api/mutations/procesos-etapas"
import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { SiNo } from "@/features/gestion-estudiantil/convivencia/components/si-no"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"
import { CampoArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-archivo"
import { CampoFecha } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-fecha"
import { ConstructorPruebasDescargos } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/constructor-pruebas-descargos"
import { DialogProcesoShell, ResumenProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-proceso-shell"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { useResultadoEtapa } from "@/features/gestion-estudiantil/convivencia/hooks/use-resultado-etapa"
import { hayErrores, validarDescargos, type ValoresDescargos } from "@/features/gestion-estudiantil/convivencia/utils/proceso-etapas"

interface Props {
  proceso: ProcesoDetalle
  onClose: () => void
}

/** Registrar descargos (G.2.PRD.ETA.1): Sí (versión, pruebas, acta) o No (constancia, solo vencido el plazo). */
export function DialogRegistrarDescargos({ proceso: p, onClose }: Props) {
  const [hoy] = useState(() => formatDateValue(new Date()))
  const [v, setV] = useState<ValoresDescargos>({
    presento: null,
    fecha: hoy,
    acudiente: null,
    version: "",
    otros: "",
    pruebas: [],
    acta: [],
    constancia: "",
  })
  const [intento, setIntento] = useState(false)
  const set = (patch: Partial<ValoresDescargos>) => setV((prev) => ({ ...prev, ...patch }))
  const { error, mutationConfig } = useResultadoEtapa(onClose, "Descargos registrados.")
  const mut = useRegistrarDescargos({ mutationConfig })
  const e = useMemo(() => (intento ? validarDescargos(v, hoy, p.fecha_apertura) : {}), [intento, v, hoy, p.fecha_apertura])

  const registrar = () => {
    setIntento(true)
    if (hayErrores(validarDescargos(v, hoy, p.fecha_apertura))) return enfocarPrimerError()
    mut.mutate({
      procesoId: p.id,
      presento: v.presento === true,
      fechaDiligencia: v.fecha,
      acudientePresente: v.acudiente,
      version: v.version,
      otrosAsistentes: v.otros,
      pruebas: v.pruebas,
      acta: v.acta[0] ?? null,
      constancia: v.constancia,
    })
  }

  return (
    <DialogProcesoShell
      titulo={`Registrar descargos — ${p.estudiante.nombre}`}
      resumen={
        <ResumenProceso
          numero={p.numero}
          estado={p.estado}
          despues={[p.etapas.apertura.plazo_descargos && `Plazo para descargos: ${formatFecha(p.etapas.apertura.plazo_descargos)}`]}
        />
      }
      onClose={onClose}
      error={error}
      pending={mut.isPending}
      confirmar={{ label: "Registrar descargos", icon: <ClipboardAddIcon data-icon="inline-start" />, onClick: registrar }}
    >
      <SiNo
        id="descargos-presento"
        label="Presentó descargos"
        required
        value={v.presento}
        noDeshabilitado={!p.acciones.puede_no_presentar}
        error={e.presento}
        onChange={(presento) => set({ presento })}
      />
      {!p.acciones.puede_no_presentar && (
        <p className="-mt-2 text-xs text-muted-foreground">«No» solo se habilita cuando venció el plazo para descargos.</p>
      )}
      {v.presento === true && (
        <>
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            <CampoFecha
              id="descargos-fecha"
              label="Fecha de la diligencia"
              value={v.fecha}
              min={p.fecha_apertura}
              max={hoy}
              error={e.fecha}
              onChange={(fecha) => set({ fecha })}
            />
            <SiNo
              id="descargos-acudiente"
              label="Acudiente presente"
              required
              value={v.acudiente}
              error={e.acudiente}
              onChange={(acudiente) => set({ acudiente })}
            />
          </div>
          <TextoLargo
            id="descargos-version"
            label="Versión del estudiante"
            required
            max={5000}
            rows={4}
            value={v.version}
            error={e.version}
            onChange={(version) => set({ version })}
          />
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="descargos-otros">Otros asistentes</FieldLabel>
            <Input id="descargos-otros" maxLength={300} value={v.otros} onChange={(ev) => set({ otros: ev.target.value })} />
            {e.otros && <FieldError>{e.otros}</FieldError>}
          </Field>
          <ConstructorPruebasDescargos pruebas={v.pruebas} onChange={(pruebas) => set({ pruebas })} errores={e} intento={intento} />
          <CampoArchivo label="Acta de descargos firmada*" archivos={v.acta} error={e.acta} onChange={(acta) => set({ acta })} />
        </>
      )}
      {v.presento === false && (
        <TextoLargo
          id="descargos-constancia"
          label="Constancia de que no se presentaron"
          required
          max={1000}
          rows={4}
          value={v.constancia}
          error={e.constancia}
          onChange={(constancia) => set({ constancia })}
        />
      )}
    </DialogProcesoShell>
  )
}
