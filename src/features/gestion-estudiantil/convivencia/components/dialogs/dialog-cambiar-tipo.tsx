import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowsDownUpIcon, InfoIcon } from "@/components/ui/icons"
import type { Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useCambiarTipo } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import { useCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { esGrave } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoDetalle, CasoResumen } from "@/features/gestion-estudiantil/convivencia/api/types"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { DatosSiuceFields } from "@/features/gestion-estudiantil/convivencia/components/datos-siuce-fields"
import type { DatosSiuce } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { siuceBody, SIUCE_VACIO, useSecuelasHabilitadas, validarSiuce } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { DialogCasoShell } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-caso-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"
import { errorLargo } from "@/features/gestion-estudiantil/convivencia/api/validaciones"

/** Pasos obligatorios de atención de cada tipo (3.2, Decreto 1965 de 2013); el Seguimiento cierra todos. */
const PASOS_POR_TIPO: Record<string, string> = {
  TIPO_I: "Reunión con las partes y mediación · Solución acordada · Seguimiento",
  TIPO_II:
    "Atención en salud (si hubo daño) · Información a los acudientes · Medida de protección · Acción restaurativa · Información al Comité · Reporte al SIUCE · Seguimiento",
  TIPO_III:
    "Atención en salud (si aplica) · Información a los acudientes · Información a la Policía de Infancia y Adolescencia · Citación al Comité · Medida de protección · Reporte al SIUCE · Seguimiento",
}

const siuceDe = (d: CasoDetalle | undefined): DatosSiuce =>
  d
    ? {
        tiposDano: (d.tipos_dano ?? []).map(String),
        agresion: d.fk_tlv_tipo_agresion ? String(d.fk_tlv_tipo_agresion) : "",
        evento: d.fk_tlv_evento_generador ? String(d.fk_tlv_evento_generador) : "",
        repetitiva: d.situacion_repetitiva ?? null,
        secuelas: d.secuelas_fisicas ?? null,
      }
    : SIUCE_VACIO

interface Props {
  caso: CasoResumen | null
  onClose: () => void
}

export function DialogCambiarTipo({ caso, onClose }: Props) {
  const detalle = useCasoQuery(caso?.id)
  return (
    <DialogCambiarTipoForm
      key={`${caso?.id ?? "none"}-${detalle.dataUpdatedAt}`}
      caso={caso}
      detalle={detalle.data}
      onClose={onClose}
    />
  )
}

/** Cambiar tipo — Caso N (Regla 12): nuevo tipo, motivo, campos SIUCE que falten y aviso de pasos. */
function DialogCambiarTipoForm({ caso, detalle, onClose }: Props & { detalle: CasoDetalle | undefined }) {
  const { notify } = useNotify()
  const tipos = useCatalogo("TIPO_SITUACION")
  const [tipo, setTipo] = useState("")
  const [motivo, setMotivo] = useState("")
  const [siuce, setSiuce] = useState<DatosSiuce>(() => siuceDe(detalle))
  const [intento, setIntento] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const nuevoCodigo = codigoDe(tipos, tipo)
  const grave = esGrave(nuevoCodigo)
  const secuelasHabilitadas = useSecuelasHabilitadas(siuce)

  function cerrar() {
    setTipo("")
    setMotivo("")
    setIntento(false)
    setNotice(null)
    onClose()
  }

  const mut = useCambiarTipo({
    mutationConfig: {
      onSuccess: () => {
        notify("Tipo del caso cambiado.", { variant: "success" })
        cerrar()
      },
      onError: (error) => setNotice({ id: Date.now(), message: getErrorMessage(error) }),
    },
  })

  const errores = {
    tipo: !tipo ? "Elija el nuevo tipo." : undefined,
    motivo: errorLargo(motivo, 10, 1000, "El motivo"),
    ...validarSiuce(siuce, grave, secuelasHabilitadas),
  }
  const hayErrores = Object.values(errores).some(Boolean)
  const ver: Partial<typeof errores> = intento ? errores : {}

  return (
    <DialogCasoShell
      caso={caso}
      titulo="Cambiar tipo"
      className="sm:max-w-2xl"
      onClose={cerrar}
      notice={notice}
      onNoticeClose={() => setNotice(null)}
      pending={mut.isPending}
      confirmar={{
        label: "Cambiar tipo",
        icon: <ArrowsDownUpIcon data-icon="inline-start" />,
        onClick: () => {
          setIntento(true)
          if (!caso || hayErrores) return
          mut.mutate({ casoId: caso.id, FK_TLV_TIPO: Number(tipo), MOTIVO: motivo.trim(), ...siuceBody(siuce, secuelasHabilitadas) })
        },
      }}
    >
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
        <ComboOpciones
          id="tipo-nuevo"
          label="Nuevo tipo"
          required
          size="default"
          todos={false}
          value={tipo}
          options={tipos.filter((t) => t.value !== String(caso?.fk_tlv_tipo))}
          error={ver.tipo}
          onChange={setTipo}
        />
        {grave && (
          <DatosSiuceFields idPrefix="tipo-siuce" value={siuce} onChange={setSiuce} required errores={ver} conEvento={false} />
        )}
        <TextoLargo id="tipo-motivo" label="Motivo" required max={1000} value={motivo} onChange={setMotivo} error={ver.motivo} />
        {nuevoCodigo && (
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>
              Se agregan los pasos obligatorios del nuevo tipo: {PASOS_POR_TIPO[nuevoCodigo]}.
              {caso?.tipo_codigo === "TIPO_I" && grave &&
                " El caso pasa al Supervisor de sede de la sede y jornada de los estudiantes, y se crean las citaciones a los acudientes."}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DialogCasoShell>
  )
}
