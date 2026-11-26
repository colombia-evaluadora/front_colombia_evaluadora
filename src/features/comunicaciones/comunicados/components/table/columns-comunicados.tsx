"use no memo"

import { format } from "date-fns"
import { Link, useNavigate } from "@tanstack/react-router"
import type { CellContext, ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DotsThreeVerticalIcon, EyeIcon, PencilIcon, ProhibitIcon, XCircleIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { cn } from "@/lib/utils"
import { EstadoComunicadoBadge } from "@/features/comunicaciones/chat/components/comunicado-panel"
import type { ComunicadoGestion } from "@/features/comunicaciones/comunicados/api/comunicados-gestion"
import { AccionesFila, type AccionFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { tiposAbreviados, tiposCompletos } from "@/features/comunicaciones/comunicados/lib/tipos-destinatario"

export type DialogoComunicado = { tipo: "anular" | "cancelar"; c: ComunicadoGestion }

/**
 * Columnas de Publicados (M.1.LIS.1). Los ids son los valores de `sortBy` que entiende comms-service
 * (fecha, titulo, publicadoPor, destinatarios, estado): el orden se resuelve en el servidor.
 */
export function createComunicadosColumns({
  onDialogo,
}: {
  onDialogo: (d: DialogoComunicado) => void
}): ColumnDef<ComunicadoGestion>[] {
  return [
    {
      id: "fecha",
      accessorKey: "publicarEn",
      meta: { label: "Fecha" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => (
        <time dateTime={row.original.publicarEn} className="tabular-nums">
          {format(new Date(row.original.publicarEn), "dd/MM/yyyy")}
        </time>
      ),
    },
    {
      id: "titulo",
      accessorKey: "titulo",
      meta: { label: "Título" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Título" />,
      cell: ({ row }) => (
        // Texto plano como el prototipo: al detalle se entra por "Ver detalle" del hover.
        <span title={row.original.titulo} className="block max-w-72 truncate font-medium">
          {row.original.titulo}
        </span>
      ),
    },
    {
      id: "publicadoPor",
      accessorKey: "publicadoPor",
      meta: { label: "Publicado por" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Publicado por" />,
    },
    {
      id: "tipos",
      accessorFn: (row) => tiposAbreviados(row.tipos),
      enableSorting: false,
      meta: { label: "Tipos" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipos" />,
      cell: ({ row }) => <span title={tiposCompletos(row.original.tipos)}>{tiposAbreviados(row.original.tipos)}</span>,
    },
    {
      id: "destinatarios",
      accessorFn: (row) => row.destinatarios ?? 0,
      meta: { label: "Destinatarios", className: "text-center" },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Destinatarios" className="justify-center" />
      ),
      cell: ({ row }) => (
        <span className="block text-center tabular-nums">
          {(row.original.destinatarios ?? 0).toLocaleString("es-CO")}
        </span>
      ),
    },
    {
      id: "estado",
      accessorKey: "estado",
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => <EstadoComunicadoBadge estado={row.original.estado} />,
    },
    {
      id: "actions",
      // Como máximo 3 iconos a la vez: Ver detalle + Modificar + Cancelar/Anular.
      size: anchoAccionesFila(3),
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => <AccionesComunicado c={row.original} onDialogo={onDialogo} />,
    },
  ]
}

/**
 * Columnas de Recibidos y Anteriores (M.1.REC.1): las de Publicados que aplican a quien recibe (sin
 * Destinatarios, que nunca se muestra) y el punto de no leído junto al título. Única acción: Ver detalle
 * (abrirlo lo marca leído en comms-service).
 */
export function createBandejaColumns(): ColumnDef<ComunicadoGestion>[] {
  return createComunicadosColumns({ onDialogo: () => undefined })
    .filter((col) => col.id !== "destinatarios" && col.id !== "actions")
    .map((col) =>
      col.id === "titulo"
        ? {
            ...col,
            cell: ({ row }: CellContext<ComunicadoGestion, unknown>) => (
              <span className="flex min-w-0 items-center gap-2">
                <span
                  role={row.original.leido ? undefined : "img"}
                  aria-label={row.original.leido ? undefined : "No leído"}
                  className={cn("size-2 shrink-0 rounded-full", !row.original.leido && "bg-primary")}
                />
                <span
                  title={row.original.titulo}
                  className={cn("block max-w-72 truncate", !row.original.leido && "font-semibold")}
                >
                  {row.original.titulo}
                </span>
              </span>
            ),
          }
        : col,
    )
    .concat({
      // Quien recibe (estudiante o acudiente, 3.1) ve de qué establecimiento viene; el orden es del servidor.
      id: "establecimiento",
      accessorFn: (c) => c.establecimiento ?? "",
      enableSorting: false,
      meta: { label: "Establecimiento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Establecimiento" />,
      cell: ({ row }) => row.original.establecimiento || "—",
    })
    .concat({
      id: "actions",
      size: anchoAccionesFila(1),
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => <AccionesBandeja c={row.original} />,
    })
}

function AccionesBandeja({ c }: { c: ComunicadoGestion }) {
  const navigate = useNavigate()
  return (
    <AccionesFila
      etiqueta={`Opciones de ${c.titulo}`}
      acciones={[
        {
          id: "ver",
          label: "Ver detalle",
          icon: <EyeIcon />,
          onSelect: () => navigate({ to: paths.app.comunicacionesComunicadoDetalle.getHref(c.id) }),
        },
      ]}
    />
  )
}

/**
 * Iconos en el hover de la fila (escritorio). Mismas reglas que el menú ⁞: las acciones que no aplican
 * se ocultan (no se deshabilitan) para no ofrecer operaciones que el estado no admite.
 */
function AccionesComunicado({
  c,
  onDialogo,
}: {
  c: ComunicadoGestion
  onDialogo: (d: DialogoComunicado) => void
}) {
  const navigate = useNavigate()
  const { modificar, cancelar, anular } = accionesComunicado(c)
  const acciones: AccionFila[] = [
    {
      id: "ver",
      label: "Ver detalle",
      icon: <EyeIcon />,
      onSelect: () => navigate({ to: paths.app.comunicacionesComunicadoDetalle.getHref(c.id) }),
    },
  ]
  if (modificar)
    acciones.push({
      id: "modificar",
      label: "Modificar",
      icon: <PencilIcon />,
      onSelect: () => navigate({ to: paths.app.comunicacionesComunicadoEditar.getHref(c.id) }),
    })
  if (cancelar)
    acciones.push({
      id: "cancelar",
      label: "Cancelar comunicado",
      icon: <XCircleIcon />,
      onSelect: () => onDialogo({ tipo: "cancelar", c }),
    })
  if (anular)
    acciones.push({
      id: "anular",
      label: "Anular",
      icon: <ProhibitIcon className="text-red" />,
      onSelect: () => onDialogo({ tipo: "anular", c }),
    })
  return <AccionesFila etiqueta={`Opciones de ${c.titulo}`} acciones={acciones} />
}

/**
 * Qué acciones ofrece una fila (Comunicaciones 3.1): Modificar (Publicado: autor; Programado: autor o
 * Administrador del establecimiento), Cancelar (Programado: autor o Administrador) y Anular (Publicado
 * o Vencido: Supervisor de sede o Administrador), siempre en su alcance. Lo decide comms-service
 * (`puedeModificar`/`puedeCancelar`/`puedeAnular`); sin esas marcas (backend anterior) se cae a la
 * regla vieja por autoría y estado.
 */
export function accionesComunicado(c: ComunicadoGestion) {
  const vigente = c.estado === "PUBLICADO" || c.estado === "PROGRAMADO"
  return {
    modificar: c.puedeModificar ?? (c.esAutor && vigente),
    cancelar: c.puedeCancelar ?? c.estado === "PROGRAMADO",
    anular: c.puedeAnular ?? (c.estado === "PUBLICADO" || c.estado === "VENCIDO"),
  }
}

/** Menú ⁞ para las tarjetas de móvil (M.1.LIS.2 y M.1.LIS.3), con las mismas acciones que la fila. */
export function MenuAccionesComunicado({
  c,
  onDialogo,
}: {
  c: ComunicadoGestion
  onDialogo: (d: DialogoComunicado) => void
}) {
  const { modificar, cancelar, anular } = accionesComunicado(c)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Opciones de ${c.titulo}`}
        className="grid size-8 place-items-center rounded-md hover:bg-muted"
      >
        <DotsThreeVerticalIcon className="size-4.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={<Link to={paths.app.comunicacionesComunicadoDetalle.getHref(c.id)} />}
          nativeButton={false}
        >
          <EyeIcon aria-hidden />
          Ver detalle
        </DropdownMenuItem>
        {modificar && (
          <DropdownMenuItem
            render={<Link to={paths.app.comunicacionesComunicadoEditar.getHref(c.id)} />}
            nativeButton={false}
          >
            <PencilIcon aria-hidden />
            Modificar
          </DropdownMenuItem>
        )}
        {cancelar && (
          <DropdownMenuItem onClick={() => onDialogo({ tipo: "cancelar", c })}>
            <XCircleIcon aria-hidden />
            Cancelar comunicado
          </DropdownMenuItem>
        )}
        {anular && (
          <DropdownMenuItem variant="destructive" onClick={() => onDialogo({ tipo: "anular", c })}>
            <ProhibitIcon aria-hidden />
            Anular
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
