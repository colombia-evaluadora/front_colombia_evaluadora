import { Link, useNavigate } from "@tanstack/react-router"

import { TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ClipboardTextIcon, ClockCounterClockwiseIcon, DotsThreeVerticalIcon, FilePdfIcon, FileTextIcon, FileUploadOutlinedIcon, FloppyDiskIcon, LockIcon, PaperclipIcon, ProhibitIcon, SpinnerIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import { descargarPlan } from "@/features/gestion-estudiantil/inclusion/piar/api/descargas"
import type { FichaPiar } from "@/features/gestion-estudiantil/inclusion/piar/hooks/use-ficha-piar"
import { COLOR_ESTADO, esEditable, sinAjustesTodas } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"

const SECUNDARIO = { size: "sm", variant: "outline", color: "neutral" } as const

export function EncabezadoFicha({ ficha }: { ficha: FichaPiar }) {
  const navigate = useNavigate()
  const { piar, estado, gestiona, access, setDialogo, form, guardando, documento, abrirActivacion } = ficha
  const trasladado = piar.fk_tpiar_origen != null
  const borrador = estado === "BORRADOR"
  return (
    <TableScreenHeader>
      <TableScreenTitle
        className="flex-wrap"
        action={
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {estado === "REVISION_CONCLUIDA" && access.puedeGestionar && !piar.solo_consulta && <Button size="sm" onClick={() => setDialogo({ tipo: "nuevaVersion" })}>Iniciar nueva versión</Button>}
            {piar.ve_sensible && (
              <Button {...SECUNDARIO} render={<Link to={paths.app.piarHistorial.getHref(piar.id)} />} nativeButton={false}>
                <ClockCounterClockwiseIcon data-icon="inline-start" />
                Historial
              </Button>
            )}
            {gestiona && trasladado && borrador && <Button {...SECUNDARIO} onClick={abrirActivacion}>Activar PIAR</Button>}
            {gestiona && (
              <Button {...SECUNDARIO} onClick={() => setDialogo({ tipo: "cerrar" })}>
                <LockIcon data-icon="inline-start" />
                Cerrar PIAR
              </Button>
            )}
            {esEditable(estado) && <Button {...SECUNDARIO} onClick={() => navigate({ to: paths.app.inclusionOrientacion.getHref() })}>{gestiona ? "Cancelar" : "Volver"}</Button>}
            {gestiona && borrador && sinAjustesTodas(piar) && <Button {...SECUNDARIO} onClick={() => setDialogo({ tipo: "concluir" })}>Concluir revisión sin ajustes</Button>}
            {gestiona && borrador && piar.ve_sensible && (
              <Button size="sm" disabled={guardando} onClick={() => form.handleSubmit()}>
                {guardando ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FloppyDiskIcon data-icon="inline-start" />}
                Guardar
              </Button>
            )}
            {piar.ve_sensible && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="icon-sm" variant="outline" color="neutral" aria-label="Más acciones del PIAR" />}>
                  <DotsThreeVerticalIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => documento(descargarPlan(piar.id))}><FileTextIcon />Generar borrador del PIAR</DropdownMenuItem>
                  {gestiona && <DropdownMenuItem onClick={() => setDialogo({ tipo: "emitir" })}><FilePdfIcon />Emitir versión del PIAR</DropdownMenuItem>}
                  {gestiona && <DropdownMenuItem disabled={!piar.ajustes.length} onClick={() => setDialogo({ tipo: "evidencia" })}><PaperclipIcon />Registrar evidencia directa</DropdownMenuItem>}
                  {gestiona && <DropdownMenuItem onClick={() => setDialogo({ tipo: "antecedente" })}><ClipboardTextIcon />Registrar antecedente</DropdownMenuItem>}
                  {gestiona && <DropdownMenuItem onClick={() => setDialogo({ tipo: "externo" })}><FileUploadOutlinedIcon />Incorporar informe externo</DropdownMenuItem>}
                  {access.puedeAnular && !piar.solo_consulta && !piar.anulacion && estado !== "CERRADO" && <DropdownMenuItem onClick={() => setDialogo({ tipo: "anular" })}><ProhibitIcon />Anular PIAR</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      >
        <span className="flex flex-wrap items-center gap-2">
          PIAR · {piar.estudiante.nombre} · {piar.estudiante.grado_grupo}
          <Badge variant="soft" color={COLOR_ESTADO[estado] ?? "muted"}><span>{piar.estado.nombre}</span></Badge>
          {trasladado && <Badge variant="soft" color="info">Traslado</Badge>}
        </span>
      </TableScreenTitle>
    </TableScreenHeader>
  )
}
