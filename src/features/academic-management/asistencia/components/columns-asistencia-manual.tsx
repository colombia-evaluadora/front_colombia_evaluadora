import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { EyeIcon, PaperclipIcon, XIcon } from "@/components/ui/icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload"
import { cn } from "@/lib/utils"

import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"
import { formatHoraRango } from "@/features/academic-management/asistencia/api/ui-mappings"
import type { RosterEstudiante, TipoAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"
import type { TipoAsistenciaOption } from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"

function VerSoporteButton({ archivoLocal, fkSoporteArchivo }: { archivoLocal: File | null; fkSoporteArchivo: number | null }) {
  const { data: url, isPending } = useArchivoViewUrl(archivoLocal ? null : fkSoporteArchivo)
  const puedeVer = Boolean(archivoLocal) || Boolean(url)

  function handleVer() {
    if (archivoLocal) {
      window.open(URL.createObjectURL(archivoLocal), "_blank", "noopener,noreferrer")
    } else if (url) {
      window.open(url, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <button
      type="button"
      aria-label="Ver soporte"
      disabled={!puedeVer || isPending}
      className="text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      onClick={handleVer}
    >
      <EyeIcon className="size-3.5 shrink-0" />
    </button>
  )
}

const NO_ASISTIO: TipoAsistencia = 2
const LLEGO_TARDE: TipoAsistencia = 5

interface BuildColumnsParams {
  fechaLabel: string
  tipoOptions: TipoAsistenciaOption[]
  seleccion: Record<number, TipoAsistencia>
  onChange: (fkMatricula: number, tipo: TipoAsistencia) => void
  soporte: Record<number, File>
  onSoporteChange: (fkMatricula: number, archivo: File | null) => void
  soporteEliminado: Record<number, boolean>
  onSoporteEliminar: (fkMatricula: number) => void
  /** Bloques de la sesion (>1 = asignatura de bloques seguidos). */
  bloques: number[]
  horasPorBloque: Record<number, { horaInicio: string | null; horaFin: string | null }>
  bloqueTarde: Record<number, number>
  onBloqueTardeChange: (fkMatricula: number, bloque: number) => void
}

export function buildColumnsAsistenciaManual({
  fechaLabel,
  tipoOptions,
  seleccion,
  onChange,
  soporte,
  onSoporteChange,
  soporteEliminado,
  onSoporteEliminar,
  bloques,
  horasPorBloque,
  bloqueTarde,
  onBloqueTardeChange,
}: BuildColumnsParams): ColumnDef<RosterEstudiante>[] {
  const bloqueItems = Object.fromEntries(
    bloques.map((b) => {
      const horas = horasPorBloque[b]
      const rango = horas ? formatHoraRango(horas.horaInicio, horas.horaFin) : ""
      return [b.toString(), rango ? `Bloque ${b + 1} (${rango})` : `Bloque ${b + 1}`]
    }),
  )
  const tipoItems = Object.fromEntries(tipoOptions.map((opt) => [opt.value.toString(), opt.label]))

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
        const mostrarBloque = value === LLEGO_TARDE && bloques.length > 1
        return (
          <div className="flex flex-col gap-1">
            <Select
              items={tipoItems}
              value={value?.toString() ?? ""}
              onValueChange={(next) => onChange(fkMatricula, Number(next) as TipoAsistencia)}
            >
              <SelectTrigger variant="outlined" size="sm" className="h-8 w-64">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {tipoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mostrarBloque && (
              <Select
                items={bloqueItems}
                value={bloqueTarde[fkMatricula]?.toString() ?? ""}
                onValueChange={(next) => onBloqueTardeChange(fkMatricula, Number(next))}
              >
                <SelectTrigger variant="outlined" size="sm" className="h-8 w-64">
                  <SelectValue placeholder="Seleccionar bloque" />
                </SelectTrigger>
                <SelectContent>
                  {bloques.map((b) => (
                    <SelectItem key={b} value={b.toString()}>
                      {bloqueItems[b.toString()]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
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
        if (tipo !== NO_ASISTIO && tipo !== LLEGO_TARDE) return null

        const eliminado = soporteEliminado[fkMatricula] ?? false
        const archivo = soporte[fkMatricula] ?? null
        const nombreExistente = archivo || eliminado ? null : row.original.soporte_nombre
        const fkSoporteExistente = archivo || eliminado ? null : row.original.fk_soporte_archivo
        const hayArchivo = Boolean(archivo || nombreExistente)
        return (
          <div className="flex items-center gap-1">
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
                      hayArchivo ? "text-foreground" : "text-muted-foreground",
                    )}
                  />
                }
              >
                <PaperclipIcon className="size-4 shrink-0" />
                <span className="max-w-36 truncate">{archivo?.name ?? nombreExistente ?? "Sin soporte"}</span>
              </FileUploadTrigger>
            </FileUpload>
            {hayArchivo && <VerSoporteButton archivoLocal={archivo} fkSoporteArchivo={fkSoporteExistente} />}
            {hayArchivo && (
              <button
                type="button"
                aria-label="Quitar soporte"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onSoporteEliminar(fkMatricula)}
              >
                <XIcon className="size-3.5 shrink-0" />
              </button>
            )}
          </div>
        )
      },
    },
  ]
}
