import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import type { Efectividad, EfectividadGrupo } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  formatConPorcentaje,
  formatPct,
  formatRendimiento,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-estrategias"

function Cifra({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-2xl tabular-nums">{children}</dd>
    </div>
  )
}

function TarjetaGrupo({ titulo, total, grupo }: { titulo: string; total: number; grupo: EfectividadGrupo }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">
        {titulo} ({total})
      </h3>
      <dl className="grid grid-cols-2 gap-4">
        <Cifra label="Siguen Cursando">{formatConPorcentaje(grupo.siguen_cursando, total)}</Cifra>
        <Cifra label="Se retiraron">{formatConPorcentaje(grupo.retirados, total)}</Cifra>
      </dl>
      <dl className="grid grid-cols-2 gap-4 border-t pt-3">
        <Dato label="Tasa de promoción">{formatPct(grupo.tasa_promocion_pct)}</Dato>
        <Dato label="Rendimiento promedio">{formatRendimiento(grupo.rendimiento_promedio)}</Dato>
      </dl>
    </div>
  )
}

/**
 * Efectividad (G.8.EST.7 y §9.7): beneficiarios frente a los no beneficiarios del mismo Período Académico —
 * siguen Cursando, se retiraron, tasa de promoción y rendimiento promedio—. Solo se pinta si el detalle la trae.
 */
export function EfectividadEstrategia({ efectividad: e }: { efectividad: Efectividad }) {
  return (
    <section aria-labelledby="efectividad-titulo" className="flex flex-col gap-3">
      <h2 id="efectividad-titulo" className="text-lg font-semibold">
        Efectividad
      </h2>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TarjetaGrupo titulo="Beneficiarios" total={e.beneficiarios} grupo={e} />
        <TarjetaGrupo
          titulo="No beneficiarios del Período Académico"
          total={e.no_beneficiarios.estudiantes}
          grupo={e.no_beneficiarios}
        />
      </div>
    </section>
  )
}
