import { useState } from "react"
import { Link, useParams } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"
import { fetchArchivoViewUrl } from "@/lib/files"

import { formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import { descargarActualizacion } from "@/features/gestion-estudiantil/inclusion/piar/api/descargas"
import { usePiarHistorialQuery } from "@/features/gestion-estudiantil/inclusion/piar/api/query/use-piar-query"
import { useEjecutarPiar } from "@/features/gestion-estudiantil/inclusion/piar/api/mutations/piar"
import { usePiarAccess } from "@/features/gestion-estudiantil/inclusion/piar/api/use-piar-access"
import { TablaDatos } from "@/features/gestion-estudiantil/inclusion/piar/components/tabla-datos"
import { FormDialogPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/form-dialog-piar"
import { AvisoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import { textoElemento } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"
import type { VersionHistorial } from "@/features/gestion-estudiantil/inclusion/piar/api/types"

const COLOR_VERSION: Record<string, "success" | "warning" | "muted"> = { ACORDADA: "success", PENDIENTE_ACUERDO: "warning" }

interface Fila {
  clave: string
  version: string
  tipo: string
  estado?: VersionHistorial["estado"]
  fecha: string
  autor: string | null
  motivo: string | null
  cambio: string
  archivo: number | null
  archivoNombre: string | null
  actualizacion?: number
}

/** Una fila por versión y otra por cada actualización que recibió, de la más reciente a la más antigua. */
function aFilas(versiones: VersionHistorial[]): Fila[] {
  return versiones.flatMap((v) => [
    ...[...v.actualizaciones].reverse().map((u) => ({
      clave: `u${u.id}`,
      version: v.numero,
      tipo: u.tipo_cambio_nombre,
      estado: v.estado,
      fecha: u.aplica_desde,
      autor: u.registra,
      motivo: u.por_que,
      cambio: Object.keys(u.valores_nuevos ?? {})
        .map((k) => `${textoElemento(k)}: ${u.valores_anteriores?.[k] ?? "—"} → ${u.valores_nuevos[k]}`)
        .join(" · "),
      archivo: u.fk_tarchivo_soporte,
      archivoNombre: u.soporte_nombre,
      actualizacion: u.id,
    })),
    {
      clave: `v${v.id}`,
      version: v.numero,
      // Una versión de trabajo posterior solo queda vinculada a la conclusión: no es esa revisión.
      tipo: v.estado.codigo === "VERSION_TRABAJO" ? "Versión de trabajo" : v.conclusion ? "Revisión concluida" : v.acordada_en ? "Versión acordada" : "Versión de trabajo",
      estado: v.estado,
      fecha: v.fecha_acuerdo ?? v.creada_en,
      autor: (v.estado.codigo !== "VERSION_TRABAJO" && v.conclusion?.responsable) || v.autor,
      motivo: v.estado.codigo === "VERSION_TRABAJO" ? (v.conclusion ? "Nueva versión tras la revisión concluida." : null) : (v.conclusion?.sintesis ?? null),
      cambio: "—",
      archivo: v.fk_tarchivo_acta,
      archivoNombre: v.acta_nombre,
    },
  ])
}

const abrir = async (id: number) => window.open((await fetchArchivoViewUrl(id)).url, "_blank", "noopener")

/** G.4.PIA.CIC.3: historial de versiones; el docente solo recibe la historia de sus ajustes. */
export function PiarHistorialPage() {
  const { piarId } = useParams({ strict: false }) as { piarId: string }
  const { data, isPending, error, refetch } = usePiarHistorialQuery(Number(piarId))
  const ejecutar = useEjecutarPiar()
  const { puedeGestionar } = usePiarAccess()
  const [soporte, setSoporte] = useState(false)
  const filas = aFilas(data?.versiones ?? [])
  const pendiente = data?.versiones?.find((v) => v.estado.codigo === "PENDIENTE_ACUERDO")

  return (
    <NoticeProvider>
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button size="sm" variant="outline" color="neutral" render={<Link to={paths.app.piarFicha.getHref(piarId)} />} nativeButton={false}>
              Volver
            </Button>
          }
        >
          Historial del PIAR
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody contentClassName="flex flex-col gap-3">
        {isPending && <Skeleton className="h-64 w-full" />}
        {error && <ErrorNoticeBanner error={error} action={{ label: "Reintentar", onClick: () => refetch() }} />}
        {pendiente && (
          <AvisoPiar>
            <span className="flex flex-wrap items-center gap-3">
              La versión {pendiente.numero} sigue pendiente de acuerdo hasta que se cargue el documento de actualización firmado.
              {puedeGestionar && <Button size="xs" variant="outline" color="neutral" onClick={() => setSoporte(true)}>Cargar documento firmado</Button>}
            </span>
          </AvisoPiar>
        )}
        {soporte && pendiente && (
          <FormDialogPiar
            abierto
            onClose={() => setSoporte(false)}
            titulo={`Cargar documento firmado — Versión ${pendiente.numero}`}
            confirmar="Cargar"
            campos={[]}
            archivos={{ label: "Documento de actualización firmado", max: 1, required: true, ayuda: "PDF o imagen, máximo 10 MB" }}
            onSubmit={(_, archivos) => ejecutar("post", `/versiones/${pendiente.id}/soporte`, { FK_ARCHIVO: archivos[0] })}
          />
        )}
        {data?.ajustes && (
          <ul className="grid gap-2 text-sm">
            {data.ajustes.map((a) => (
              <li key={a.id} className="rounded-lg border border-border p-3">
                <strong>{a.asignatura_nombre}</strong> · {a.ajuste}
                <p className="text-muted-foreground">Seguimiento: {a.seguimientos.map((s) => s.periodo_nombre).join(", ") || "sin registrar"}</p>
              </li>
            ))}
          </ul>
        )}
        {data?.versiones && (
          <TablaDatos
            id="piar-historial"
            rows={filas}
            rowId={(f) => f.clave}
                        emptyMessage="Aún no hay versiones."
            columns={[
              { id: "version", header: "Versión", cell: ({ row }) => <span className="font-medium">{row.original.version}</span> },
              { id: "tipo", header: "Tipo", cell: ({ row }) => row.original.tipo },
              {
                id: "estado",
                header: "Estado de la versión",
                cell: ({ row }) => row.original.estado && <Badge variant="soft" color={COLOR_VERSION[row.original.estado.codigo] ?? "muted"}><span>{row.original.estado.nombre}</span></Badge>,
              },
              { id: "fecha", header: "Fecha", cell: ({ row }) => formatFecha(row.original.fecha) },
              { id: "autor", header: "Autor", cell: ({ row }) => row.original.autor ?? "—" },
              { id: "motivo", header: "Motivo", cell: ({ row }) => <span className="block min-w-72 whitespace-normal">{row.original.motivo ?? "—"}</span> },
              { id: "cambio", header: "Cambio (anterior → nuevo)", cell: ({ row }) => <span className="block min-w-80 whitespace-normal">{row.original.cambio}</span> },
              {
                id: "archivo",
                header: "Archivo",
                cell: ({ row }) => (
                  <span className="flex flex-col items-start gap-1">
                    {row.original.archivo ? <button type="button" className="text-primary hover:underline" onClick={() => abrir(row.original.archivo as number)}>{row.original.archivoNombre ?? "Ver archivo"}</button> : "—"}
                    {row.original.actualizacion && <button type="button" className="text-primary hover:underline" onClick={() => descargarActualizacion(row.original.actualizacion as number)}>Documento</button>}
                  </span>
                ),
              },
            ]}
          />
        )}
      </TableScreenBody>
    </TableScreen>
    </NoticeProvider>
  )
}
