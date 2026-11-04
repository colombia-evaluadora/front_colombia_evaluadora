import { DatePicker } from "@/components/date-picker"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { ClipboardAddIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { useAuth } from "@/features/auth/hooks/use-auth"

import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import type { CasoResumen } from "@/features/gestion-estudiantil/convivencia/api/types"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { CampoCodigosSiuce } from "@/features/gestion-estudiantil/convivencia/components/dialogs/campo-codigos-siuce"
import { DialogCasoShell } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-caso-shell"
import { SoportesUpload } from "@/features/gestion-estudiantil/convivencia/components/soportes-upload"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"
import { useRegistrarAccion } from "@/features/gestion-estudiantil/convivencia/hooks/use-registrar-accion"

interface Props {
  caso: CasoResumen | null
  onClose: () => void
}

/** Registrar acción del protocolo (3.2): campos condicionales por código de la acción. */
export function DialogRegistrarAccion({ caso, onClose }: Props) {
  const { user } = useAuth()
  const entidades = useCatalogo("ENTIDAD_CONCERNIDA_CONVIVENCIA")
  const resultados = useCatalogo("RESULTADO_SEGUIMIENTO")
  const f = useRegistrarAccion(caso, onClose)
  const { ver, fechaHora, setFechaHora } = f

  return (
    <DialogCasoShell
      caso={caso}
      titulo="Registrar acción"
      className="sm:max-w-2xl"
      onClose={f.cerrar}
      notice={f.notice}
      onNoticeClose={f.cerrarNotice}
      pending={f.pending}
      confirmar={{ label: "Registrar", icon: <ClipboardAddIcon data-icon="inline-start" />, onClick: f.registrar }}
    >
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        <ComboOpciones
          id="accion-accion"
          label="Acción"
          required
          size="default"
          todos={false}
          value={f.accion}
          options={f.acciones}
          error={ver.accion}
          onChange={f.elegirAccion}
        />
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(ver.fecha) || undefined}>
            <FieldLabel htmlFor="accion-fecha">Fecha*</FieldLabel>
            <DatePicker
              id="accion-fecha"
              maxDate={new Date()}
              value={parseDateValue(fechaHora.fecha)}
              onChange={(date) => setFechaHora({ ...fechaHora, fecha: date ? formatDateValue(date) : "" })}
            />
            {ver.fecha && <FieldError>{ver.fecha}</FieldError>}
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="accion-hora">Hora*</FieldLabel>
            <DatePicker
              id="accion-hora"
              mode="time"
              value={fechaHora.hora}
              onChange={(hora) => setFechaHora({ ...fechaHora, hora })}
            />
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="accion-responsable">Responsable*</FieldLabel>
            <Input id="accion-responsable" value={user?.name ?? ""} readOnly disabled />
          </Field>
        </div>
        <FieldDescription className="-mt-2">
          El responsable es quien registra la acción.
          {f.fechaHechosDesconocida && " La fecha de los hechos es desconocida: no se puede contrastar con la ocurrencia."}
        </FieldDescription>

        {f.conEntidad && (
          <ComboOpciones
            id="accion-entidad"
            label="Entidad"
            required
            size="default"
            todos={false}
            value={f.entidad}
            options={entidades}
            error={ver.entidad}
            onChange={f.setEntidad}
          />
        )}
        {f.esSeguimiento && (
          <ComboOpciones
            id="accion-resultado"
            label="Resultado del seguimiento"
            required
            size="default"
            todos={false}
            value={f.resultado}
            options={resultados}
            error={ver.resultado}
            onChange={f.setResultado}
          />
        )}
        {f.condicional && (
          <label className="flex items-center gap-3 text-sm">
            <Switch round checked={f.noAplica} onCheckedChange={f.setNoAplica} aria-label="No aplica" />
            No aplica
            <span className="text-xs text-muted-foreground">· justifíquelo en la descripción</span>
          </label>
        )}

        <TextoLargo
          id="accion-descripcion"
          label="Descripción"
          required
          max={2000}
          value={f.descripcion}
          onChange={f.setDescripcion}
          error={ver.descripcion}
        />

        {f.esSiuce && <CampoCodigosSiuce codigos={f.codigos} onChange={f.setCodigos} afectados={f.afectados} error={ver.codigos} />}

        <SoportesUpload label="Soportes de la acción" archivos={f.soportes} onChange={f.setSoportes} max={5} />
      </div>
    </DialogCasoShell>
  )
}
