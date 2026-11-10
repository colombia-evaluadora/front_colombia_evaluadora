import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProhibitIcon } from "@/components/ui/icons"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useNotify } from "@/components/notice/notice-context"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { useAnularProceso } from "@/features/gestion-estudiantil/convivencia/api/mutations/procesos"
import type { ProcesoResumen } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { COLOR_ESTADO_PROCESO } from "@/features/gestion-estudiantil/convivencia/api/procesos-ui"
import { errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"

interface Props {
  proceso: ProcesoResumen | null
  onClose: () => void
}

/** Anular el proceso: motivo obligatorio; el proceso se conserva con la marca Anulado (Regla 3). */
export function DialogAnularProceso({ proceso, onClose }: Props) {
  const { notify } = useNotify()
  const [texto, setTexto] = useState("")
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const cerrar = () => {
    setTexto("")
    setIntento(false)
    setError(null)
    onClose()
  }

  const mut = useAnularProceso({
    mutationConfig: {
      onSuccess: () => {
        notify("Proceso anulado.", { variant: "success" })
        cerrar()
      },
      onError: (e: Error) => setError(e),
    },
  })
  const errorMotivo = intento ? errorLargo(texto, 10, 1000, "El motivo") : undefined

  return (
    <Dialog open={proceso != null} onOpenChange={(open) => !open && !mut.isPending && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Anular el proceso — {proceso?.estudiante_nombre}</DialogTitle>
          {proceso && (
            <DialogDescription render={<div />}>
              <span className="flex flex-wrap items-center gap-2">
                <span>Proceso {proceso.numero} ·</span>
                <Badge variant="soft" color={COLOR_ESTADO_PROCESO[proceso.estado_codigo] ?? "muted"}>
                  <span>{proceso.estado_nombre}</span>
                </Badge>
              </span>
            </DialogDescription>
          )}
        </DialogHeader>
        <ErrorNoticeBanner error={error} />
        <TextoLargo
          id="anular-proceso-motivo"
          label="Motivo"
          required
          max={1000}
          placeholder="Por qué se anula el proceso"
          value={texto}
          onChange={setTexto}
          error={errorMotivo}
        />
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cancelar</DialogClose>
          <Button
            size="sm"
            type="button"
            color="destructive"
            disabled={mut.isPending}
            onClick={() => {
              setIntento(true)
              if (!proceso || errorLargo(texto, 10, 1000, "El motivo")) return
              mut.mutate({ procesoId: proceso.id, motivo: texto })
            }}
          >
            <IconoCarga cargando={mut.isPending}>
              <ProhibitIcon data-icon="inline-start" />
            </IconoCarga>
            Anular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
