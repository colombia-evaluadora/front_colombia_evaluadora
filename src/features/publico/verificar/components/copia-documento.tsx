import { useEffect, useState } from "react"
import QRCode from "qrcode"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { WarningCircleIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import type { DocumentoVerificado, InformePeriodo } from "@/features/publico/verificar/datos-demo"

const PERIODOS = ["P1", "P2", "P3", "P4"]

/**
 * Copia de solo lectura del documento, para compararla con el impreso. Si el
 * documento fue reemplazado se avisa arriba y la etiqueta lo dice.
 */
export function CopiaDocumento({ documento }: { documento: DocumentoVerificado }) {
  const informe = documento.contenido
  if (!informe) return null
  const reemplazado = documento.estado === "REEMPLAZADO"

  return (
    <div className="flex flex-col gap-4">
      {reemplazado && (
        <Alert variant="warning">
          <WarningCircleIcon />
          <AlertDescription>
            Este documento se reemplazó por uno generado el {documento.reemplazadoEl}. Pida el documento actualizado al
            establecimiento.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="soft" color={reemplazado ? "orange" : "success"}>
          {reemplazado ? "Copia reemplazada · solo lectura" : "Copia verificada · solo lectura"}
        </Badge>
        <span className="text-muted-foreground text-sm">
          Informe de período · {informe.estudiante} · emitido el {informe.generado.fecha}
        </span>
      </div>
      <div className="overflow-x-auto">
        <InformeImpreso informe={informe} codigo={documento.codigo} />
      </div>
    </div>
  )
}

/** Réplica en pantalla del informe de período impreso (la "hoja"). */
function InformeImpreso({ informe, codigo }: { informe: InformePeriodo; codigo: string }) {
  const [qr, setQr] = useState<string | null>(null)
  useEffect(() => {
    QRCode.toDataURL(codigo, { margin: 0, width: 128 }).then(setQr, () => setQr(null))
  }, [codigo])

  const celda = "border border-navy/20 px-2 py-1"
  return (
    <article
      aria-label="Copia del informe de período"
      className="mx-auto min-w-[40rem] max-w-3xl border bg-white p-8 text-xs text-slate-800 shadow-sm"
    >
      <div className="border-t-4 border-navy pt-5">
        <header className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-navy text-lg font-bold text-navy">
            IE
          </span>
          <div className="flex-1">
            <p className="text-base font-bold text-navy">{informe.institucion}</p>
            <p>
              DANE {informe.dane} · NIT {informe.nit}
            </p>
            <p className="text-slate-500">{informe.ciudad}</p>
          </div>
          <div className="text-right text-slate-500">
            <p>Generado el</p>
            <p className="font-semibold text-slate-800">{informe.generado.fecha}</p>
            <p>{informe.generado.hora}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            {qr ? <img src={qr} alt={`Código QR ${codigo}`} className="size-16" /> : <span className="size-16 bg-slate-100" />}
            <span className="font-mono text-[9px]">{codigo}</span>
          </div>
        </header>

        <div className="mt-5 flex items-baseline gap-3 bg-navy px-4 py-2 text-white">
          <span className="text-base font-bold uppercase">{informe.estudiante}</span>
          <span className="text-[11px] opacity-80">{informe.documentoEnmascarado}</span>
        </div>

        <dl className="grid grid-cols-3">
          {informe.datos.map((d) => (
            <div key={d.etiqueta} className={celda}>
              <dt className="text-[10px] text-slate-500">{d.etiqueta}</dt>
              <dd className="font-semibold">{d.valor}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-2 text-[10px] text-slate-500">
          <span className="font-semibold text-slate-700">Convenciones:</span> C: calificación obtenida · R: Refuerzo o
          Recuperación · I.H.: intensidad horaria · PIA: porcentaje de influencia en el área · I.I.: inasistencias
          injustificadas · I.J.: inasistencias justificadas.
        </p>

        <h3 className="mt-4 bg-navy px-4 py-1.5 text-[11px] font-bold text-white">CONSOLIDADO DE CALIFICACIONES</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-navy/5 text-navy">
              <th className={cn(celda, "text-left")}>Área / Asignatura</th>
              <th className={cn(celda, "w-14 text-right")}>I.H.</th>
              {PERIODOS.map((p) => (
                <th key={p} className={cn(celda, "w-20 text-right")}>
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {informe.areas.map((a) => (
              <FilasArea key={a.nombre} area={a} celda={celda} />
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

function FilasArea({ area, celda }: { area: InformePeriodo["areas"][number]; celda: string }) {
  return (
    <>
      <tr className="font-semibold">
        <td className={celda}>{area.nombre}</td>
        <td className={cn(celda, "text-right")}>{area.ih}</td>
        {area.notas.map((n, i) => (
          <td key={i} className={cn(celda, "text-right")}>
            {n}
          </td>
        ))}
      </tr>
      {area.asignaturas.map((s) => (
        <tr key={s.nombre}>
          <td className={cn(celda, "pl-6")}>{s.nombre}</td>
          <td className={cn(celda, "text-right")}>{s.ih}</td>
          {s.notas.map((n, i) => (
            <td key={i} className={cn(celda, "text-right")}>
              {n}
              {i === 0 && s.detalle && <span className="block text-[9px] text-slate-500">{s.detalle}</span>}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
