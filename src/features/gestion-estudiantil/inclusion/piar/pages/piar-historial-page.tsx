import { Link, useParams } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"
import { fetchArchivoViewUrl } from "@/lib/files"

import { formatFecha } from "@/features/gestion-estudiantil/observador/api/ui-mappings"
import { descargarActualizacion, usePiarHistorialQuery } from "@/features/gestion-estudiantil/inclusion/piar/api/piar-api"
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
        .map((k) => `${k}: ${u.valores_anteriores?.[k] ?? "—"} → ${u.valores_nuevos[k]}`)
        .join(" · "),
      archivo: u.fk_tarchivo_soporte,
      actualizacion: u.id,
    })),
    {
      clave: `v${v.id}`,
      version: v.numero,
      tipo: v.conclusion ? "Revisión concluida" : v.acordada_en ? "Versión acordada" : "Versión de trabajo",
      estado: v.estado,
      fecha: v.fecha_acuerdo ?? v.creada_en,
      autor: v.conclusion?.responsable ?? null,
      motivo: v.conclusion?.sintesis ?? null,
      cambio: "—",
      archivo: v.fk_tarchivo_acta,
    },
  ])
}

const abrir = async (id: number) => window.open((await fetchArchivoViewUrl(id)).url, "_blank", "noopener")

/** G.4.PIA.CIC.3: historial de versiones; el docente solo recibe la historia de sus ajustes. */
export function PiarHistorialPage() {
  const { piarId } = useParams({ strict: false }) as { piarId: string }
  const { data, isPending, error, refetch } = usePiarHistorialQuery(Number(piarId))
  const filas = aFilas(data?.versiones ?? [])
  const pendiente = data?.versiones?.find((v) => v.estado.codigo === "PENDIENTE_ACUERDO")

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button size="sm" variant="outline" color="muted" render={<Link to={paths.app.piarFicha.getHref(piarId)} />} nativeButton={false}>
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
          <div className="rounded-lg bg-yellow-22 px-4 py-3 text-sm">
            La versión {pendiente.numero} sigue pendiente de acuerdo hasta que se cargue el documento de actualización firmado.
          </div>
        )}
        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  {["Versión", "Tipo", "Estado de la versión", "Fecha", "Autor", "Motivo", "Cambio (anterior → nuevo)", "Archivo"].map((h) => (
                    <th key={h} className="px-2 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.clave} className="border-b border-border align-top">
                    <td className="px-2 py-3 font-medium">{f.version}</td>
                    <td className="px-2 py-3">{f.tipo}</td>
                    <td className="px-2 py-3">
                      {f.estado && <Badge variant="soft" color={COLOR_VERSION[f.estado.codigo] ?? "muted"}><span>{f.estado.nombre}</span></Badge>}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">{formatFecha(f.fecha)}</td>
                    <td className="px-2 py-3">{f.autor ?? "—"}</td>
                    <td className="px-2 py-3">{f.motivo ?? "—"}</td>
                    <td className="px-2 py-3">{f.cambio}</td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <span className="flex flex-col items-start gap-1">
                        {f.archivo ? <button type="button" className="text-primary hover:underline" onClick={() => abrir(f.archivo as number)}>Ver archivo</button> : "—"}
                        {f.actualizacion && <button type="button" className="text-primary hover:underline" onClick={() => descargarActualizacion(f.actualizacion as number)}>Documento</button>}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.ajustes?.map((a) => (
                  <tr key={a.id} className="border-b border-border align-top">
                    <td className="px-2 py-3" colSpan={8}>
                      <strong>{a.asignatura_nombre}</strong> · {a.ajuste} ({a.seguimientos.map((s) => s.periodo_nombre).join(", ") || "sin seguimiento"})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
