import { Link, useNavigate } from "@tanstack/react-router"

import { TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ClipboardTextIcon, ClockCounterClockwiseIcon, DotsThreeVerticalIcon, FilePdfIcon, FileTextIcon, FileUploadOutlinedIcon, FloppyDiskIcon, LockIcon, PaperclipIcon, ProhibitIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { descargarPlan } from "@/features/gestion-estudiantil/inclusion/piar/api/descargas"
import type { FichaPiar } from "@/features/gestion-estudiantil/inclusion/piar/hooks/use-ficha-piar"
import { COLOR_ESTADO, esEditable, sinAjustesTodas } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"

const SECUNDARIO = { size: "sm", variant: "outline", color: "neutral" } as const

export function EncabezadoFicha({ ficha }: { ficha: FichaPiar }) {
  const navigate = useNavigate()
  const { piar, estado, setDialogo, form, guardando, hayCambios, documento, abrirActivacion } = ficha
  const trasladado = piar.fk_tpiar_origen != null
  const borrador = estado === "BORRADOR"
  return (
    <TableScreenHeader>
      <TableScreenTitle
        className="flex-wrap"
        action={
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {estado === "REVISION_CONCLUIDA" && <Button size="sm" disabled={!piar.puede_nueva_version} onClick={() => setDialogo({ tipo: "nuevaVersion" })}>Iniciar nueva versión</Button>}
            {piar.ve_sensible && (
              <Button {...SECUNDARIO} render={<Link to={paths.app.piarHistorial.getHref(piar.id)} />} nativeButton={false}>
                <ClockCounterClockwiseIcon data-icon="inline-start" />
                Historial
              </Button>
            )}
            {trasladado && borrador && <Button {...SECUNDARIO} disabled={!piar.puede_activar} onClick={abrirActivacion}>Activar PIAR</Button>}
            {estado !== "REVISION_CONCLUIDA" && (
              <Button {...SECUNDARIO} disabled={!piar.puede_cerrar} onClick={() => setDialogo({ tipo: "cerrar" })}>
                <LockIcon data-icon="inline-start" />
                Cerrar PIAR
              </Button>
            )}
            {esEditable(estado) && <Button {...SECUNDARIO} onClick={() => navigate({ to: paths.app.inclusionOrientacion.getHref() })}>{piar.puede_modificar ? "Cancelar" : "Volver"}</Button>}
            {borrador && sinAjustesTodas(piar) && <Button {...SECUNDARIO} disabled={!piar.puede_concluir_revision} onClick={() => setDialogo({ tipo: "concluir" })}>Concluir revisión sin ajustes</Button>}
            {esEditable(estado) && piar.ve_sensible && (
              <Button size="sm" disabled={!piar.puede_modificar || guardando || !hayCambios} onClick={() => form.handleSubmit()}>
                <IconoCarga cargando={guardando}><FloppyDiskIcon data-icon="inline-start" /></IconoCarga>
                Guardar
              </Button>
            )}
            {piar.ve_sensible && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="icon-sm" variant="outline" color="neutral" aria-label="Más acciones del PIAR" />}>
                  <DotsThreeVerticalIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={!piar.puede_registrar_expediente || !piar.ajustes.length} onClick={() => setDialogo({ tipo: "evidencia" })}><PaperclipIcon />Registrar evidencia directa</DropdownMenuItem>
                  <DropdownMenuItem disabled={!piar.puede_registrar_expediente} onClick={() => setDialogo({ tipo: "antecedente" })}><ClipboardTextIcon />Registrar antecedente</DropdownMenuItem>
                  <DropdownMenuItem disabled={!piar.puede_registrar_expediente} onClick={() => setDialogo({ tipo: "externo" })}><FileUploadOutlinedIcon />Incorporar informe externo</DropdownMenuItem>
                  <DropdownMenuItem disabled={!piar.puede_anular} onClick={() => setDialogo({ tipo: "anular" })}><ProhibitIcon />Anular PIAR</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => documento(descargarPlan(piar.id))}><FileTextIcon />Generar borrador del PIAR</DropdownMenuItem>
                  <DropdownMenuItem disabled={!piar.puede_emitir} onClick={() => setDialogo({ tipo: "emitir" })}><FilePdfIcon />Emitir versión del PIAR</DropdownMenuItem>
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
