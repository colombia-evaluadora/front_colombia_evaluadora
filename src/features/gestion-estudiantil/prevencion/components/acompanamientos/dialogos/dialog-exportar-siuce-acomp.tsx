import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { FileXlsIcon } from "@/components/ui/icons"

import { SelectorColumnasSiuce } from "@/features/gestion-estudiantil/convivencia/components/siuce/selector-columnas-siuce"
import { agruparColumnas, filtrarColumnas } from "@/features/gestion-estudiantil/convivencia/utils/siuce"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import {
  useExportarSiuceAcomp,
  type ExportarSiuceAcompInput,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/acompanamientos"
import { SIUCE_ACOMP_COLUMNAS } from "@/features/gestion-estudiantil/prevencion/api/siuce-acomp-columnas"
import type { TipoAcompanamiento } from "@/features/gestion-estudiantil/prevencion/api/types"
import { TITULO_ACOMP } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"

interface Props {
  tipo: TipoAcompanamiento
  /** Los filtros aplicados en el listado: el Excel trae las mismas filas, sin paginar. */
  filters: ExportarSiuceAcompInput["filters"]
  /** Revisión previa: cuántos acompañamientos coinciden con esos filtros y su descripción legible. */
  total: number
  filtrosTexto: string[]
  onClose: () => void
}

const AVISO = {
  EMBARAZO:
    "Reporte de apoyo en Excel para consultar y digitar a mano en el SIUCE, separado del de convivencia. No se carga solo, los datos desconocidos quedan vacíos o como Sin información, y cerrar el acompañamiento aquí no cierra ningún registro externo. La maternidad o paternidad local no se exporta como embarazo de la persona acompañada.",
  CONSUMO:
    "Reporte de apoyo en Excel para consultar y digitar a mano en el SIUCE. No se carga solo, no se inventan semanas ni diagnósticos, los datos desconocidos quedan como Sin información y cerrar el acompañamiento aquí no cierra ningún registro externo.",
}

/** Exportar para el SIUCE (G.8.EMB.7 / G.8.CON.6): revisión previa, columnas seleccionables (§3.4) y descarga. */
export function DialogExportarSiuceAcomp({ tipo, filters, total, filtrosTexto, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const todas = SIUCE_ACOMP_COLUMNAS[tipo]
  const [columnas, setColumnas] = useState<string[]>(() => todas.map((c) => c.clave))
  const [busqueda, setBusqueda] = useState("")
  const errorColumnas = columnas.length === 0 ? "Elija al menos una columna." : undefined

  const mut = useExportarSiuceAcomp({
    mutationConfig: {
      onSuccess: (r) => {
        if (r.status === "ok") {
          notify(r.message, { variant: "success" })
          onClose()
        } else s.setError(new Error(r.message))
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  return (
    <DialogoOperacionShell
      titulo={`Exportar para el SIUCE — ${TITULO_ACOMP[tipo]}`}
      resumen={
        <span>
          {total} {total === 1 ? "acompañamiento" : "acompañamientos"} con los filtros del listado
          {filtrosTexto.length ? `: ${filtrosTexto.join(" · ")}` : " (sin filtros)"}. Los anulados no se exportan salvo que
          filtre por Anulado.
        </span>
      }
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      className="sm:max-w-3xl"
      confirmar={{
        label: "Exportar",
        icon: <FileXlsIcon data-icon="inline-start" />,
        disabled: total === 0,
        onClick: () => {
          s.setIntento(true)
          s.setError(null)
          if (errorColumnas) return
          // El reporte mantiene el orden del catálogo aunque se elijan en otro orden.
          mut.mutate({ tipo, filters, columnas: todas.map((c) => c.clave).filter((c) => columnas.includes(c)) })
        },
      }}
    >
      <SelectorColumnasSiuce
        grupos={agruparColumnas(filtrarColumnas(todas, busqueda))}
        seleccionadas={columnas}
        onAlternar={(clave, marcada) =>
          setColumnas((prev) => (marcada ? [...new Set([...prev, clave])] : prev.filter((c) => c !== clave)))
        }
        onTodas={() => setColumnas(todas.map((c) => c.clave))}
        onLimpiar={() => setColumnas([])}
        busqueda={busqueda}
        onBusqueda={setBusqueda}
        error={s.intento ? errorColumnas : undefined}
      />
      <p className="text-xs text-muted-foreground">{AVISO[tipo]}</p>
      <p className="text-xs text-muted-foreground">
        La generación queda en la bitácora con el usuario, la fecha, los filtros, las columnas elegidas, la versión del
        formato y el archivo.
      </p>
    </DialogoOperacionShell>
  )
}
