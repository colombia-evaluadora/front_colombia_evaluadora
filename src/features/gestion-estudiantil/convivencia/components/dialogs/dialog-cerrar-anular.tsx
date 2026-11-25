import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircleIcon, InfoIcon, ProhibitIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { nombreDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { useAnularCaso, useCerrarCaso } from "@/features/gestion-estudiantil/convivencia/api/mutations/casos"
import type { CasoResumen } from "@/features/gestion-estudiantil/convivencia/api/types"
import { DialogCasoShell } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-caso-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"

interface Props {
  caso: CasoResumen | null
  onClose: () => void
}

function useEstadoDialogo(onClose: () => void) {
  const [texto, setTexto] = useState("")
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const cerrar = () => {
    setTexto("")
    setIntento(false)
    setError(null)
    onClose()
  }
  const onError = (e: Error) => setError(e)
  return { texto, setTexto, intento, setIntento, error, cerrar, onError }
}

/**
 * Cerrar el caso (3.1, Regla 12): resumen 10–2000. Los bloqueos (Comité con quórum,
 * sin seguimiento, último seguimiento no superado) los dice el backend.
 */
export function DialogCerrarCaso({ caso, onClose }: Props) {
  const { notify } = useNotify()
  const detalle = useCasoQuery(caso?.id).data
  const manifestaciones = useCatalogo("MANIFESTACION_SITUACION")
  const sesion = [...(detalle?.sesiones_comite ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
  const s = useEstadoDialogo(onClose)
  const mut = useCerrarCaso({
    mutationConfig: {
      onSuccess: () => {
        notify("Caso cerrado.", { variant: "success" })
        s.cerrar()
      },
      onError: s.onError,
    },
  })
  const error = s.intento ? errorLargo(s.texto, 10, 2000, "El resumen") : undefined

  // G.2.CAS.PRT.2: la Regla 12 no se corrige en este modal; se informa el motivo y nada más.
  const mensaje = s.error ? getErrorMessage(s.error) : ""
  const bloqueo = mensaje.startsWith("No se puede cerrar") ? mensaje : null
  if (caso && bloqueo) {
    return (
      <Dialog open onOpenChange={(open) => !open && s.cerrar()}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>No se puede cerrar el caso {caso.numero}</DialogTitle>
            <DialogDescription>{bloqueo}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" type="button" onClick={s.cerrar}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <DialogCasoShell
      caso={caso}
      titulo="Cerrar el caso"
      onClose={s.cerrar}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Cerrar caso",
        icon: <CheckCircleIcon data-icon="inline-start" />,
        onClick: () => {
          s.setIntento(true)
          if (!caso || errorLargo(s.texto, 10, 2000, "El resumen")) return
          mut.mutate({ casoId: caso.id, resumen: s.texto })
        },
      }}
    >
      <Alert variant="info">
        <InfoIcon aria-hidden="true" />
        <AlertDescription>
          Un caso cerrado no se reabre; si el estudiante lo necesita, se abre un caso nuevo vinculado a este.
        </AlertDescription>
      </Alert>
      <p className="text-sm text-muted-foreground">
        {[caso?.tipo_nombre, nombreDe(manifestaciones, detalle?.fk_tlv_manifestacion)].filter(Boolean).join(" · ")}
        {sesion && ` · Comité: sesión del ${formatFecha(sesion.fecha)}${sesion.con_quorum ? " con quórum" : " sin quórum"}`}
        {detalle?.ultimo_seguimiento && ` · Último seguimiento: ${detalle.ultimo_seguimiento}`}
      </p>
      <TextoLargo
        id="cerrar-resumen"
        label="Resumen del resultado de cierre"
        required
        rows={4}
        max={2000}
        descripcion="De 10 a 2000 caracteres."
        value={s.texto}
        onChange={s.setTexto}
        error={error}
      />
      <p className="text-xs text-muted-foreground">
        La fecha, la hora y quién cierra los registra el sistema. Un caso cerrado no se reabre ni se edita.
      </p>
    </DialogCasoShell>
  )
}

/** Anular el caso: motivo obligatorio; el caso se conserva con la marca Anulado. */
export function DialogAnularCaso({ caso, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo(onClose)
  const mut = useAnularCaso({
    mutationConfig: {
      onSuccess: () => {
        notify("Caso anulado.", { variant: "success" })
        s.cerrar()
      },
      onError: s.onError,
    },
  })
  const error = s.intento ? errorLargo(s.texto, 10, 1000, "El motivo") : undefined

  return (
    <DialogCasoShell
      caso={caso}
      titulo="Anular el caso"
      onClose={s.cerrar}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Anular",
        color: "destructive",
        icon: <ProhibitIcon data-icon="inline-start" />,
        onClick: () => {
          s.setIntento(true)
          if (!caso || errorLargo(s.texto, 10, 1000, "El motivo")) return
          mut.mutate({ casoId: caso.id, motivo: s.texto })
        },
      }}
    >
      <TextoLargo
        id="anular-motivo"
        label="Motivo"
        required
        max={1000}
        placeholder="Por qué se anula el caso"
        value={s.texto}
        onChange={s.setTexto}
        error={error}
      />
    </DialogCasoShell>
  )
}
