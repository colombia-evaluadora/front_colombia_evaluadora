import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileUploadOutlinedIcon, InfoIcon, PaperclipIcon, XIcon } from "@/components/ui/icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"
import { formatHoraRango } from "@/features/academic-management/asistencia/api/ui-mappings"
import type {
  JustificacionLocal,
  RosterEstudiante,
  TipoAsistencia,
} from "@/features/academic-management/asistencia/api/types/asistencia"

const ASISTIO: TipoAsistencia = 1
const NO_ASISTIO: TipoAsistencia = 2
const LLEGO_TARDE: TipoAsistencia = 5

/** Los valores de _Estado de asistencia_ como botones de opción (Sección 7). */
const ESTADOS: { tipo: TipoAsistencia; label: string }[] = [
  { tipo: ASISTIO, label: "Asistió" },
  { tipo: NO_ASISTIO, label: "No asistió" },
  { tipo: LLEGO_TARDE, label: "Llegó tarde" },
]

function ConAyuda({ titulo, ayuda, className }: { titulo: string; ayuda: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1", className)}>
      {titulo}
      <Tooltip>
        <TooltipTrigger
          render={<button type="button" aria-label={`Ayuda: ${titulo}`} className="text-muted-foreground" />}
        >
          <InfoIcon className="size-4" />
        </TooltipTrigger>
        <TooltipContent className="max-w-64 normal-case tracking-normal">{ayuda}</TooltipContent>
      </Tooltip>
    </span>
  )
}

/** Nombre del archivo como enlace: abre el local recién elegido o el ya guardado. */
function EnlaceSoporte({
  archivoLocal,
  fkSoporteArchivo,
  nombre,
}: {
  archivoLocal: File | null
  fkSoporteArchivo: number | null
  nombre: string
}) {
  const { data: url } = useArchivoViewUrl(archivoLocal ? null : fkSoporteArchivo)

  function abrir() {
    if (archivoLocal) {
      const objectUrl = URL.createObjectURL(archivoLocal)
      window.open(objectUrl, "_blank", "noopener,noreferrer")
      // La pestaña ya cargó el archivo: se libera después para no acumular blobs.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } else if (url) {
      window.open(url, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <button
      type="button"
      disabled={!archivoLocal && !url}
      onClick={abrir}
      className="flex min-w-0 items-center gap-1.5 text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
    >
      <PaperclipIcon className="size-4 shrink-0" />
      <span className="max-w-40 truncate">{nombre}</span>
    </button>
  )
}

interface BuildColumnsParams {
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
  /** Con excusa o justificación no se pide el bloque de llegada. */
  tieneExcusa: (row: RosterEstudiante) => boolean
  /** Regla 75: matrículas con un cambio esperando aprobación. */
  conPendiente: Set<number>
  /** Sin Guardar en ASISTENCIAS: se ve, no se cambia. */
  soloLectura: boolean
  /** Regla 109: docente de la clase o Responsable de grupo (aunque sea solo lectura). */
  puedeJustificar: boolean
  onJustificar: (row: RosterEstudiante) => void
  /** Justificación hecha en pantalla antes de guardar (manda sobre la guardada). */
  justificacionLocal: Record<number, JustificacionLocal>
}

/** Planilla de la sesión (Sección 7): una fila por estudiante, el estado como
 *  botones de opción, el bloque de llegada y la excusa. */
export function buildColumnsAsistenciaManual({
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
  tieneExcusa,
  conPendiente,
  soloLectura,
  puedeJustificar,
  onJustificar,
  justificacionLocal,
}: BuildColumnsParams): ColumnDef<RosterEstudiante>[] {
  const bloqueItems = Object.fromEntries(
    bloques.map((b) => {
      const horas = horasPorBloque[b]
      const rango = horas ? formatHoraRango(horas.horaInicio, horas.horaFin) : ""
      return [b.toString(), rango ? `Bloque ${b + 1} (${rango})` : `Bloque ${b + 1}`]
    }),
  )

  return [
    {
      id: "nombre",
      accessorKey: "estudiante",
      meta: { label: "Estudiante" },
      header: "Estudiante",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <span className="font-semibold">{row.original.estudiante}</span>
          {conPendiente.has(row.original.fk_tmatricula) && (
            <Badge variant="soft" color="warning">
              Pendiente de aprobación
            </Badge>
          )}
        </span>
      ),
    },
    ...ESTADOS.map<ColumnDef<RosterEstudiante>>(({ tipo, label }) => ({
      id: `estado-${tipo}`,
      meta: { label },
      header: () => <span className="block text-center">{label}</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const fk = row.original.fk_tmatricula
        return (
          <span className="flex justify-center">
            <input
              type="radio"
              name={`asistencia-${fk}`}
              aria-label={`${label}: ${row.original.estudiante}`}
              checked={seleccion[fk] === tipo}
              disabled={soloLectura}
              onChange={() => onChange(fk, tipo)}
              className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
            />
          </span>
        )
      },
    })),
    {
      id: "bloqueLlegada",
      meta: { label: "Bloque de llegada" },
      header: () => (
        <ConAyuda
          titulo="Bloque de llegada"
          ayuda="Con Llegó tarde y sin excusa ni justificación, elija el bloque en que llegó. Es opcional."
          // Ancho del selector reservado: no corre las columnas cuando aparece.
          className="min-w-40"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const fk = row.original.fk_tmatricula
        if (seleccion[fk] !== LLEGO_TARDE || bloques.length <= 1 || tieneExcusa(row.original)) {
          return <span className="text-muted-foreground">—</span>
        }
        return (
          <Select
            items={bloqueItems}
            value={bloqueTarde[fk]?.toString() ?? ""}
            disabled={soloLectura}
            onValueChange={(next) => onBloqueTardeChange(fk, Number(next))}
          >
            <SelectTrigger variant="outlined" size="sm" className="h-8 w-40" aria-label="Bloque de llegada">
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              {bloques.map((b) => (
                <SelectItem key={b} value={b.toString()}>
                  {bloqueItems[b.toString()]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    },
    {
      id: "excusa",
      meta: { label: "Excusa" },
      header: () => (
        <ConAyuda
          titulo="Excusa"
          ayuda="Con No asistió o Llegó tarde, adjunte el soporte o justifique sin archivo con una explicación breve y su fuente. Las dos cuentan como Justificada."
          // Cabe "Adjuntar" + "Justificar sin archivo": la tabla no cambia de ancho al pedir excusa.
          className="min-w-72"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const r = row.original
        const fk = r.fk_tmatricula
        const tipo = seleccion[fk]
        if (tipo !== NO_ASISTIO && tipo !== LLEGO_TARDE) return <span className="text-muted-foreground">—</span>

        const eliminado = soporteEliminado[fk] ?? false
        const archivo = soporte[fk] ?? null
        const nombreExistente = archivo || eliminado ? null : r.soporte_nombre
        if (archivo || nombreExistente) {
          return (
            <span className="flex items-center gap-2">
              <EnlaceSoporte
                archivoLocal={archivo}
                fkSoporteArchivo={archivo || eliminado ? null : r.fk_soporte_archivo}
                nombre={archivo?.name ?? nombreExistente ?? ""}
              />
              {!soloLectura && (
                <button
                  type="button"
                  aria-label="Quitar excusa"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onSoporteEliminar(fk)}
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </span>
          )
        }

        const local = justificacionLocal[fk]
        const texto = local ? local.justificacion : r.justificacion
        if (texto) {
          return (
            <span className="flex items-center gap-2">
              <Badge variant="soft" color="success">
                Justificada
              </Badge>
              <button
                type="button"
                disabled={!puedeJustificar}
                onClick={() => onJustificar(r)}
                className="text-sm hover:underline disabled:no-underline"
              >
                {(local ? local.fuenteNombre : r.fuente_justificacion) ?? "Sin archivo"}
              </button>
              <Tooltip>
                <TooltipTrigger
                  render={<button type="button" aria-label="Ver justificación" className="text-muted-foreground" />}
                >
                  <InfoIcon className="size-4" />
                </TooltipTrigger>
                <TooltipContent className="max-w-64">{texto}</TooltipContent>
              </Tooltip>
            </span>
          )
        }

        return (
          <span className="flex items-center gap-3">
            {!soloLectura && (
              <FileUpload
                value={[]}
                onValueChange={(files) => onSoporteChange(fk, files[0] ?? null)}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={10 * 1024 * 1024}
                className="w-fit"
              >
                <FileUploadTrigger render={<Button type="button" variant="outline" color="neutral" size="xs" />}>
                  <FileUploadOutlinedIcon data-icon="inline-start" />
                  Adjuntar
                </FileUploadTrigger>
              </FileUpload>
            )}
            {/* Antes de guardar también: la justificación viaja con el registro. */}
            {puedeJustificar && (
              <button type="button" onClick={() => onJustificar(r)} className="text-sm text-primary hover:underline">
                Justificar sin archivo
              </button>
            )}
          </span>
        )
      },
    },
  ]
}
