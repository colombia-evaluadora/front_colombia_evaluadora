import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { PaperclipIcon } from "@/components/ui/icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload"
import { cn } from "@/lib/utils"

import type { RosterEstudiante, TipoAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"

const NO_ASISTIO: TipoAsistencia = 2

export const TIPO_OPTIONS: { value: TipoAsistencia; label: string }[] = [
  { value: 1, label: "Asistió" },
  { value: 2, label: "No asistió" },
  { value: 5, label: "Llegó tarde" },
]

const TIPO_ITEMS = Object.fromEntries(TIPO_OPTIONS.map((opt) => [opt.value.toString(), opt.label]))

interface BuildColumnsParams {
  fechaLabel: string
  seleccion: Record<number, TipoAsistencia>
  onChange: (fkMatricula: number, tipo: TipoAsistencia) => void
  soporte: Record<number, File>
  onSoporteChange: (fkMatricula: number, archivo: File | null) => void
}

export function buildColumnsAsistenciaManual({
  fechaLabel,
  seleccion,
  onChange,
  soporte,
  onSoporteChange,
}: BuildColumnsParams): ColumnDef<RosterEstudiante>[] {
  return [
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Nombres" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombres" />,
      enableHiding: false,
      cell: ({ row }) => <span className="font-medium uppercase">{row.original.estudiante}</span>,
    },
    {
      id: "tipoAsistencia",
      meta: { label: fechaLabel },
      header: ({ column }) => <DataTableColumnHeader column={column} title={fechaLabel} />,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const fkMatricula = row.original.fk_tmatricula
        const value = seleccion[fkMatricula]
        return (
          <Select
            items={TIPO_ITEMS}
            value={value?.toString() ?? ""}
            onValueChange={(next) => onChange(fkMatricula, Number(next) as TipoAsistencia)}
          >
            <SelectTrigger variant="outlined" size="sm" className="h-8 w-40">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {TIPO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    },
    {
      id: "soporte",
      meta: { label: "Soporte" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Soporte" />,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const fkMatricula = row.original.fk_tmatricula
        const tipo = seleccion[fkMatricula]
        if (tipo !== NO_ASISTIO) return null

        const archivo = soporte[fkMatricula] ?? null
        const nombreExistente = archivo ? null : row.original.soporte_nombre
        return (
          <FileUpload
            value={archivo ? [archivo] : []}
            onValueChange={(files) => onSoporteChange(fkMatricula, files[0] ?? null)}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10 * 1024 * 1024}
            className="w-fit"
          >
            <FileUploadTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 text-sm hover:underline",
                    archivo || nombreExistente ? "text-foreground" : "text-muted-foreground",
                  )}
                />
              }
            >
              <PaperclipIcon className="size-4 shrink-0" />
              <span className="max-w-36 truncate">{archivo?.name ?? nombreExistente ?? "Sin soporte"}</span>
            </FileUploadTrigger>
          </FileUpload>
        )
      },
    },
  ]
}
