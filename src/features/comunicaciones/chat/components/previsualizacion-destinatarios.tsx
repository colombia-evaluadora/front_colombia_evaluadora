import { format } from "date-fns"

import { WarningCircleIcon } from "@/components/ui/icons"
import type { PrevisualizacionComunicado } from "@/features/comunicaciones/chat/api/types"

const persona = (n: number) => (n === 1 ? "1 persona" : `${n} personas`)

/**
 * Previsualización del comunicado antes de publicar (informe de Comunicaciones §3, prototipo M.1):
 * a cuántas personas llega, sin repetir, y cuántas por tipo. Los conteos los calcula comms-service
 * con las mismas reglas de alcance que la publicación. Una persona con dos roles (por ejemplo,
 * docente y acudiente) cuenta en ambos tipos, por eso la suma puede superar el total.
 */
export function PrevisualizacionDestinatarios({
  datos: d,
  titulo,
  dirigidoA,
  publicarEn,
}: {
  datos: PrevisualizacionComunicado
  titulo: string
  dirigidoA: string
  publicarEn: string | null
}) {
  const programado = !!publicarEn && new Date(publicarEn) > new Date()
  const tipos = [
    { etiqueta: "Estudiantes", total: d.estudiantes },
    { etiqueta: "Acudientes", total: d.acudientes },
    { etiqueta: "Funcionarios", total: d.funcionarios },
    { etiqueta: "Otros", total: d.otros },
  ].filter((t) => t.total > 0)

  return (
    <div className="-mx-1 space-y-4 overflow-y-auto px-1 py-1 text-sm" aria-live="polite">
      <section aria-labelledby="previsualizacion-resumen" className="rounded-lg border px-3 py-2">
        <h3 id="previsualizacion-resumen" className="font-medium">
          {titulo}
        </h3>
        <dl className="text-muted-foreground">
          {dirigidoA && (
            <div>
              <dt className="inline">Dirigido a: </dt>
              <dd className="inline">{dirigidoA}</dd>
            </div>
          )}
          {publicarEn && (
            <div>
              <dt className="inline">{programado ? "Se publicará el: " : "Se publica: "}</dt>
              <dd className="inline">
                {programado ? format(new Date(publicarEn), "dd/MM/yyyy 'a las' hh:mm a") : "de inmediato"}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section aria-labelledby="previsualizacion-destinatarios" className="space-y-2">
        <h3 id="previsualizacion-destinatarios" className="font-medium">
          Destinatarios
        </h3>
        {d.unicos === 0 ? (
          <p role="alert" className="flex items-start gap-2 rounded-md border border-red-stroke bg-red-22 px-3 py-2 text-red">
            <WarningCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            No hay personas en los destinatarios elegidos. Vuelve atrás y cámbialos.
          </p>
        ) : (
          <dl className="divide-y rounded-lg border">
            <div className="flex items-center justify-between gap-3 px-3 py-2 font-medium">
              <dt>Destinatarios únicos</dt>
              <dd className="tabular-nums">{persona(d.unicos)}</dd>
            </div>
            {tipos.map((t) => (
              <div key={t.etiqueta} className="flex items-center justify-between gap-3 px-3 py-2">
                <dt className="text-muted-foreground">{t.etiqueta}</dt>
                <dd className="tabular-nums">{t.total}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <dt className="text-muted-foreground">Con aviso en la plataforma</dt>
              <dd className="tabular-nums">{d.unicos}</dd>
            </div>
          </dl>
        )}
        {d.sinCuenta > 0 && (
          <p role="status" className="flex items-start gap-2 rounded-md border border-yellow-stroke bg-yellow-22 px-3 py-2">
            <WarningCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-yellow" />
            <span>
              Sin cuenta: {persona(d.sinCuenta)} de los grados, grupos o roles elegidos no{" "}
              {d.sinCuenta === 1 ? "tiene" : "tienen"} cuenta activa y no {d.sinCuenta === 1 ? "recibirá" : "recibirán"} el
              comunicado.
            </span>
          </p>
        )}
        {tipos.length > 1 && (
          <p className="text-xs text-muted-foreground">
            Cada persona lo recibe una sola vez. Quien tiene más de un rol cuenta en cada tipo.
          </p>
        )}
      </section>
    </div>
  )
}
