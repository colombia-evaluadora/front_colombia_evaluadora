import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import {
  DialogoDocumento,
  Firma,
  HojaDocumento,
  type EncabezadoEstablecimiento,
} from "@/features/gestion-estudiantil/commons/components/documento-imprimible"
import { actividadesKeys } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query-keys"
import { useCertificadoServicioSocialQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-servicio-social-query"
import { formatFechaLarga, formatHoras, formatNumero } from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/formatos-actividad"

/** Certificado de servicio social (G.5.SOC.DOC.1): solo datos del backend; la hoja se arma y se imprime aquí. Sin QR (brecha B4). */
export function DialogoCertificado({ matricula, onClose }: { matricula: number; onClose: () => void }) {
  const q = useCertificadoServicioSocialQuery(matricula)
  const c = q.data
  const e = c as unknown as EncabezadoEstablecimiento | undefined
  const tipoDoc = c?.estudiante_tipo_documento_nombre ?? "documento"

  return (
    <DialogoDocumento titulo="Certificado de servicio social" isPending={q.isPending} error={q.error} onClose={onClose}>
      {c && e && (
        <HojaDocumento
          encabezado={e}
          claveModulo={actividadesKeys.all}
          titulo="Certificado de servicio social estudiantil obligatorio"
          subtitulo=""
        >
          <p className="text-justify leading-relaxed">
            {e.establecimiento} certifica que <strong className="font-semibold uppercase">{c.estudiante}</strong>, identificado
            con {tipoDoc} {c.estudiante_documento}, cumplió {formatNumero(c.horas_cumplidas)} de las{" "}
            {formatNumero(c.horas_requeridas)} horas de servicio social estudiantil obligatorio (Ley 115 de 1994, art. 97), así:
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actividad o entidad</TableHead>
                <TableHead>Año</TableHead>
                <TableHead className="text-right">Horas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {c.actividades.map((x, i) => (
                <TableRow key={`${x.actividad}-${x.anio}-${i}`}>
                  <TableCell className="whitespace-normal">
                    {x.actividad}
                    {x.entidad_externa ? ` · ${x.entidad_externa}` : ""}
                  </TableCell>
                  <TableCell>{x.anio}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatHoras(x.horas)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p>
            Se expide en {e.municipio}, el {formatFechaLarga(c.fecha_expedicion)}.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2">
            <Firma nombre={" "} rol="Rector(a)" />
            <Firma nombre={" "} rol="Secretario(a)" />
          </div>
        </HojaDocumento>
      )}
    </DialogoDocumento>
  )
}
