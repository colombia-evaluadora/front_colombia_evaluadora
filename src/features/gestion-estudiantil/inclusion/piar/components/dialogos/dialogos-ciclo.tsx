import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircleIcon, WarningCircleIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { descargarPlan } from "@/features/gestion-estudiantil/inclusion/piar/api/descargas"
import { useEjecutarPiar } from "@/features/gestion-estudiantil/inclusion/piar/api/mutations/piar"
import type { PiarDetalle } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import { FormDialogPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/form-dialog-piar"
import type { DialogoProps } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"
import { texto } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"
import { progresoBloques } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"

export function DialogosCiclo({ piar, dialogo, onClose }: DialogoProps) {
  const ejecutar = useEjecutarPiar()
  const estudiante = piar.estudiante.nombre
  const motivosCierre = useCatalogo("MOTIVO_CIERRE_PIAR")
  const comunes = { onClose, abierto: true }

  switch (dialogo.tipo) {
    case "cerrar":
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Cerrar PIAR — ${estudiante}`}
          descripcion={`Estado: ${piar.estado.nombre} · Ajustes: ${piar.ajustes.length}`}
          confirmar="Cerrar PIAR"
          confirmarColor="destructive"
          inicial={{ motivo: "FIN_PERIODO" }}
          campos={[
            { name: "motivo", label: "Motivo", kind: "select", required: true, ancho: true, options: motivosCierre.map((m) => ({ value: m.codigo, label: m.label })) },
            texto("informe", "Informe anual de competencias", 5000, { required: true }),
          ]}
          onSubmit={(v) => ejecutar("post", `/${piar.id}/cerrar`, { MOTIVO: v.motivo, INFORME_ANUAL: v.informe })}
        />
      )
    case "anular":
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Anular PIAR — ${estudiante}`}
          confirmar="Anular"
          confirmarColor="destructive"
          campos={[texto("motivo", "Motivo", 1000, { required: true, min: 10 })]}
          onSubmit={(v) => ejecutar("post", `/${piar.id}/anular`, { MOTIVO: v.motivo })}
        />
      )
    case "concluir":
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Concluir revisión sin ajustes — ${estudiante}`}
          confirmar="Concluir revisión"
          campos={[
            texto("sintesis", "Síntesis de orientación", 3000, { required: true, min: 10 }),
            texto("recomendaciones", "Recomendaciones", 2000, { required: true, min: 10 }),
            { name: "conclusion", label: "Fecha de conclusión", kind: "fecha", required: true },
            { name: "proxima", label: "Fecha de próxima revisión", kind: "fecha", required: true },
          ]}
          onSubmit={(v) =>
            ejecutar("post", `/${piar.id}/concluir-revision`, { SINTESIS: v.sintesis, RECOMENDACIONES: v.recomendaciones, FECHA_PROXIMA: v.proxima, FECHA_CONCLUSION: v.conclusion })
          }
        />
      )
    case "nuevaVersion":
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Iniciar nueva versión — ${estudiante}`}
          descripcion="La revisión concluida se conserva y el PIAR vuelve a Borrador, vinculado a ella. No se crea un segundo PIAR para la misma matrícula."
          confirmar="Iniciar nueva versión"
          campos={[]}
          onSubmit={() => ejecutar("post", `/${piar.id}/nueva-version`)}
        />
      )
    case "emitir":
      return <DialogEmitir piar={piar} onClose={onClose} />
    default:
      return null
  }
}

function DialogEmitir({ piar, onClose }: { piar: PiarDetalle; onClose: () => void }) {
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null)
  const [pending, setPending] = useState(false)
  const p = progresoBloques(piar)
  const cobertura = piar.cobertura ?? []
  const revisadas = cobertura.filter((c) => c.cobertura !== "PENDIENTE_REVISION").length
  const criterios = [
    { label: `Versión completa (${p.completos} de ${p.total} bloques)`, ok: p.completos === p.total },
    { label: `Cobertura revisada (${revisadas} de ${cobertura.length} asignaturas)`, ok: cobertura.length > 0 && revisadas === cobertura.length },
    { label: "Acta de acuerdo firmada de esta versión", ok: Boolean(piar.version_actual?.acta) },
  ]
  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Emitir versión del PIAR — {piar.estudiante.nombre}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <p className="text-sm font-medium">Versión del plan {piar.version_actual?.numero}</p>
        <ul className="grid gap-2 text-sm">
          {criterios.map((c) => (
            <li key={c.label} className="flex items-center justify-between gap-3">
              {c.label}
              <span className={`inline-flex items-center gap-1 ${c.ok ? "text-green" : "text-red"}`}>
                {c.ok ? <CheckCircleIcon className="size-4" /> : <WarningCircleIcon className="size-4" />}
                {c.ok ? "Cumple" : "No cumple"}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">El PDF lleva la versión, la fecha y el responsable; es información sensible.</p>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cancelar</DialogClose>
          <Button
            size="sm"
            disabled={pending || criterios.some((c) => !c.ok)}
            onClick={async () => {
              setPending(true)
              const r = await descargarPlan(piar.id)
              setPending(false)
              if (r.status === "error") setNotice({ id: Date.now(), message: r.message })
              else onClose()
            }}
          >
            Emitir versión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
