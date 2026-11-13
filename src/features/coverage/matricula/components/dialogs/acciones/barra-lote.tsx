import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  ArrowCounterClockwiseIcon,
  ArrowsDownUpIcon,
  ArrowsLeftRightIcon,
  FilePdfIcon,
  FileTextIcon,
  PersonAddIcon,
  PersonRemoveIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { OnlineOnlyAction } from "@/components/offline/online-only-action"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useGenerarHojas } from "@/features/coverage/matricula/api/acciones-lote"
import { ESTADOS_REACTIVABLES } from "@/features/coverage/matricula/api/reactivar"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import { DialogRetirar } from "@/features/coverage/matricula/components/dialogs/dialog-retirar-matricula"
import { DialogReingresar } from "@/features/coverage/matricula/components/dialogs/dialog-reingresar-matricula"
import { DialogReactivarMatricula } from "@/features/coverage/matricula/components/dialogs/dialog-reactivar-matricula"
import { DialogCambiarGrupo } from "@/features/coverage/matricula/components/dialogs/acciones/dialog-cambiar-grupo"
import { DialogCambiarGrado } from "@/features/coverage/matricula/components/dialogs/acciones/dialog-cambiar-grado"
import { DialogReactivarLote } from "@/features/coverage/matricula/components/dialogs/acciones/dialog-reactivar-lote"
import { DialogGenerarConstancias } from "@/features/coverage/matricula/components/dialogs/acciones/documentos"
import { ExportSelectedMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-export-selected-matricula"

type Accion = "retirar" | "reingresar" | "reactivar" | "cambiar-grupo" | "cambiar-grado" | "constancias"

/** Sin solicitud de retiro ni anulación pendiente (Regla 71): admite cambios académicos. */
const libre = (m: Matricula) => !m.retiroSolicitado && !m.anulacionPendiente
const cursando = (m: Matricula) => m.status === "Cursando"
/** Mismo grado y mismo Período Académico (sede y jornada): lo exigen cambiar de grupo y corregir grado. */
const mismoPeriodoYGrado = (sel: Matricula[]) =>
  sel.every((m) => m.grade === sel[0].grade && m.campus === sel[0].campus && m.shift === sel[0].shift)

interface Definicion {
  accion: Accion
  /** Etiqueta con una fila y con varias (en lote, el cambio de grado es solo corrección). */
  label: (n: number) => string
  Icon: typeof PersonRemoveIcon
  /** null si sirve para toda la selección; si no, por qué no se ofrece. */
  bloqueo: (sel: Matricula[]) => string | null
  editar?: boolean
}

const ACCIONES: Definicion[] = [
  {
    accion: "retirar",
    label: () => "Retirar",
    Icon: PersonRemoveIcon,
    editar: true,
    bloqueo: (sel) =>
      !sel.every(cursando)
        ? "Solo se retiran matrículas Cursando."
        : !sel.every(libre)
          ? "Hay estudiantes con solicitud de retiro o anulación pendiente: respóndala desde su fila."
          : null,
  },
  {
    accion: "reingresar",
    label: () => "Reingresar",
    Icon: PersonAddIcon,
    editar: true,
    bloqueo: (sel) => (sel.every((m) => m.status === "Retirado") ? null : "Solo se reingresan matrículas Retiradas."),
  },
  {
    accion: "reactivar",
    label: () => "Reactivar",
    Icon: ArrowCounterClockwiseIcon,
    editar: true,
    bloqueo: (sel) =>
      sel.length === 1
        ? ESTADOS_REACTIVABLES.includes(sel[0].status)
          ? null
          : "Solo se reactivan matrículas con un estado final."
        : sel.every((m) => m.status === "Aprobado" || m.status === "Reprobado")
          ? null
          : "En lote solo se reactivan Aprobadas o Reprobadas; las Promovidas y Reubicadas, una por una.",
  },
  {
    accion: "cambiar-grupo",
    label: () => "Cambiar de grupo",
    Icon: ArrowsLeftRightIcon,
    editar: true,
    bloqueo: (sel) =>
      !sel.every((m) => cursando(m) && libre(m))
        ? "Solo se cambian matrículas Cursando sin solicitud pendiente."
        : !mismoPeriodoYGrado(sel)
          ? "En lote, todas deben ser del mismo grado, sede y jornada. Los cambios de sede o jornada van uno por uno."
          : null,
  },
  {
    accion: "cambiar-grado",
    label: (n) => (n === 1 ? "Cambiar de grado" : "Corregir grado"),
    Icon: ArrowsDownUpIcon,
    editar: true,
    bloqueo: (sel) =>
      !sel.every((m) => cursando(m) && libre(m))
        ? "Solo se cambian matrículas Cursando sin solicitud pendiente."
        : !mismoPeriodoYGrado(sel)
          ? "En lote, todas deben ser del mismo grado, sede y jornada."
          : null,
  },
  {
    accion: "constancias",
    label: (n) => (n === 1 ? "Generar constancia" : "Generar constancias"),
    Icon: FilePdfIcon,
    bloqueo: (sel) => (sel.every(cursando) ? null : "La constancia de estudio solo se genera para matrículas Cursando."),
  },
]

/**
 * Barra de acciones por lote de la lista (Regla 56, C.1.LOT.1–8): solo se
 * ofrecen las acciones que sirven para todas las filas marcadas; las demás
 * quedan deshabilitadas con el motivo en el tooltip.
 */
export function BarraLote({ selected, resetSelection }: { selected: Matricula[]; resetSelection: () => void }) {
  const { puedeEditar } = useMenuPermission("MATRICULA")
  const { notify } = useNotify()
  const [abierta, setAbierta] = useState<Accion | null>(null)
  const hojas = useGenerarHojas()
  const count = selected.length

  const cerrar = (open: boolean) => !open && setAbierta(null)
  const props = { matriculas: selected, onOpenChange: cerrar, onDone: resetSelection }
  const hojasBloqueo = selected.every(cursando) ? null : "La hoja de matrícula solo se genera para matrículas Cursando."

  function conAyuda(key: string, boton: ReactNode, ayuda: string | null) {
    return (
      <OnlineOnlyAction key={key}>
        {ayuda ? (
          <Tooltip>
            {/* Un botón deshabilitado no recibe el hover: el tooltip va en un span. */}
            <TooltipTrigger render={<span className="inline-flex" />}>{boton}</TooltipTrigger>
            <TooltipContent className="max-w-xs">{ayuda}</TooltipContent>
          </Tooltip>
        ) : (
          boton
        )}
      </OnlineOnlyAction>
    )
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-md bg-primary-22 p-3">
      <span className="mr-2 text-sm font-medium tabular-nums">
        {count === 1 ? "1 seleccionado" : `${count} seleccionados`}
      </span>
      <Button type="button" variant="ghost" color="primary" size="sm" onClick={resetSelection}>
        <XIcon data-icon="inline-start" />
        Quitar selección
      </Button>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {ACCIONES.filter((a) => !a.editar || puedeEditar).map(({ accion, label, Icon, bloqueo }) => {
          const motivo = bloqueo(selected)
          return conAyuda(
            accion,
            <Button
              type="button"
              variant="outline"
              color="primary"
              size="sm"
              disabled={Boolean(motivo)}
              onClick={() => setAbierta(accion)}
            >
              <Icon data-icon="inline-start" />
              {label(count)}
            </Button>,
            motivo,
          )
        })}
        {conAyuda(
          "hojas",
          <Button
            type="button"
            variant="outline"
            color="primary"
            size="sm"
            disabled={Boolean(hojasBloqueo) || hojas.isPending}
            onClick={() =>
              hojas.mutate(
                selected.map((m) => m.id),
                {
                  onSuccess: () =>
                    notify(count === 1 ? "Se generó la hoja de matrícula." : `Se generaron ${count} hojas de matrícula en un PDF.`),
                  onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
                },
              )
            }
          >
            {hojas.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FileTextIcon data-icon="inline-start" />
            )}
            {count === 1 ? "Generar hoja de matrícula" : "Generar hojas de matrícula"}
          </Button>,
          hojasBloqueo,
        )}
        <OnlineOnlyAction>
          <ExportSelectedMatriculaDialog selectedIds={selected.map((m) => m.id)} resetSelection={resetSelection} />
        </OnlineOnlyAction>
      </div>

      {abierta === "retirar" ? <DialogRetirar {...props} /> : null}
      {abierta === "reingresar" ? <DialogReingresar {...props} /> : null}
      {abierta === "cambiar-grupo" ? <DialogCambiarGrupo {...props} /> : null}
      {abierta === "cambiar-grado" ? <DialogCambiarGrado {...props} /> : null}
      {abierta === "constancias" ? <DialogGenerarConstancias {...props} /> : null}
      {abierta === "reactivar" ? (
        count === 1 ? (
          <DialogReactivarMatricula
            matricula={selected[0]}
            onOpenChange={cerrar}
            onDone={(mensaje) => {
              notify(mensaje)
              setAbierta(null)
              resetSelection()
            }}
          />
        ) : (
          <DialogReactivarLote {...props} />
        )
      ) : null}
    </div>
  )
}
