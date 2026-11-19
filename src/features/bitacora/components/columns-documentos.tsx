"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { CaretDownIcon, CaretRightIcon, InfoIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { DocumentoEmitido } from "@/features/bitacora/api/types/documentos"
import { EstadoDocumentoBadge } from "@/features/bitacora/components/estado-documento-badge"
import { fechaHoraDoc } from "@/features/bitacora/utils/fechas"

/** Columnas de Documentos emitidos (B.8.LIS.1); la flecha abre el historial y las consultas. */
export function createDocumentosColumns({
  expandido,
  onToggle,
}: {
  expandido: string | null
  onToggle: (d: DocumentoEmitido) => void
}): ColumnDef<DocumentoEmitido>[] {
  return [
    {
      id: "expand",
      meta: { className: "w-0 pr-0 pl-3" },
      header: () => <span className="sr-only">Ver detalle</span>,
      cell: ({ row }) => {
        const abierto = expandido === row.original.codigo
        const label = abierto ? "Ocultar detalle" : "Ver detalle"
        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`${label} de ${row.original.codigo}`}
                  aria-expanded={abierto}
                  onClick={() => onToggle(row.original)}
                />
              }
            >
              {abierto ? <CaretDownIcon /> : <CaretRightIcon />}
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "codigo",
      meta: { label: "Código" },
      header: "Código",
      cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.codigo}</span>,
    },
    { id: "tipo", meta: { label: "Tipo de documento", className: "min-w-32 whitespace-normal" }, header: "Tipo de documento", accessorKey: "tipo" },
    {
      id: "estudiante",
      meta: { label: "Estudiante", className: "min-w-40 whitespace-normal" },
      header: "Estudiante",
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="font-medium">{row.original.estudiante}</span>
          <span className="text-xs whitespace-nowrap text-muted-foreground">{row.original.documentoEstudiante}</span>
        </span>
      ),
    },
    { id: "grado", meta: { label: "Grado/Grupo" }, header: "Grado/Grupo", accessorKey: "gradoGrupo" },
    { id: "periodo", meta: { label: "Período", className: "min-w-24 whitespace-normal" }, header: "Período", accessorKey: "periodo" },
    {
      id: "generado",
      meta: { label: "Generado" },
      header: "Generado",
      cell: ({ row }) => (
        <span className="flex flex-col tabular-nums">
          <span>{fechaHoraDoc(row.original.generadoEn)}</span>
          <span className="text-xs text-muted-foreground">{row.original.generadoPor}</span>
        </span>
      ),
    },
    {
      id: "estado",
      meta: { label: "Estado" },
      header: "Estado",
      cell: ({ row }) => <EstadoDocumentoBadge estado={row.original.estado} />,
    },
    {
      id: "consultas",
      meta: { label: "Consultas", className: "text-center" },
      header: () => (
        <span className="flex items-center justify-center gap-1">
          Consultas
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label="Qué cuenta Consultas"
                  className="inline-flex rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                />
              }
            >
              <InfoIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent className="max-w-64">Veces que se abrió la página de verificación del documento.</TooltipContent>
          </Tooltip>
        </span>
      ),
      cell: ({ row }) => <span className="block text-center tabular-nums">{row.original.consultas}</span>,
    },
  ]
}
