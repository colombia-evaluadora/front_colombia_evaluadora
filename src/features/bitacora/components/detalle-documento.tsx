import { format } from "date-fns"

import type { DocumentoEmitido } from "@/features/bitacora/api/types/documentos"
import { fechaHoraDoc } from "@/features/bitacora/utils/fechas"

const fechaCorta = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso : format(d, "dd/MM/yyyy")
}

const celdaEncabezado = "bg-table-screen-title px-4 py-2.5 font-medium text-muted-foreground"
const celda = "bg-background px-4 py-2.5"

/**
 * Fila desplegada de un documento emitido (B.8.LIS.1): su historial de estados y las consultas de la página
 * de verificación, con el estilo de las tablas de datos (gris claro en encabezados, valores en blanco).
 */
// Color del punto de cada hito: el mismo token que el punto del badge de estado (success=green, warning=yellow, destructive=red).
const PUNTO_ESTADO = [
  { prefijo: "Reemplazado", clase: "border-yellow" },
  { prefijo: "Anulado", clase: "border-red" },
] as const
const puntoDe = (texto: string) => PUNTO_ESTADO.find((p) => texto.startsWith(p.prefijo))?.clase ?? "border-green"

const CODIGO_DOCUMENTO = /([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})/

/** Texto del hito con los códigos de otros documentos como enlace (busca ese documento en la tabla). */
function TextoHito({ texto, onVerCodigo }: { texto: string; onVerCodigo?: (codigo: string) => void }) {
  return (
    <>
      {texto.split(CODIGO_DOCUMENTO).map((parte, i) =>
        i % 2 === 1 && onVerCodigo ? (
          <button
            key={i}
            type="button"
            className="text-primary hover:underline focus-visible:underline focus-visible:outline-none"
            onClick={() => onVerCodigo(parte)}
          >
            {parte}
          </button>
        ) : (
          parte
        ),
      )}
    </>
  )
}

export function DetalleDocumento({
  documento: d,
  onVerCodigo,
}: {
  documento: DocumentoEmitido
  /** Al pulsar el código de otro documento (p. ej. el que lo reemplaza). */
  onVerCodigo?: (codigo: string) => void
}) {
  return (
    <section aria-label={`Detalle de ${d.codigo}`} className="flex flex-wrap items-start gap-x-12 gap-y-4">
      <div className="flex max-w-lg min-w-0 flex-col gap-1.5">
        <h3 className="text-sm font-semibold">Historial de estados</h3>
        {/* Un punto por hito con el color del estado, del más antiguo al más reciente. */}
        <ol className="flex flex-col text-sm">
          {d.historial.map((h) => {
            return (
              <li key={h.fecha} className="flex gap-3 pb-4 last:pb-0">
                <span aria-hidden className={`mt-1 size-3 shrink-0 rounded-full border-[3px] bg-background ${puntoDe(h.texto)}`} />
                <p>
                  <span className="tabular-nums">{fechaHoraDoc(h.fecha)}</span> ·{" "}
                  <TextoHito texto={h.texto} onVerCodigo={onVerCodigo} />
                </p>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="flex max-w-full flex-col gap-1.5">
        <h3 className="text-sm font-semibold">Consultas de la página de verificación</h3>
        {d.consultasDetalle.length ? (
          <div
            role="table"
            className="grid w-fit max-w-full grid-cols-[8rem_6rem_minmax(8rem,14rem)] gap-px overflow-hidden rounded-lg border border-border bg-border text-sm"
          >
            <div role="row" className="contents">
              <div role="columnheader" className={celdaEncabezado}>Fecha</div>
              <div role="columnheader" className={`${celdaEncabezado} text-center`}>Consultas</div>
              <div role="columnheader" className={celdaEncabezado}>Otros usos</div>
            </div>
            {d.consultasDetalle.map((c) => (
              <div key={c.fecha} role="row" className="contents">
                <div role="cell" className={`${celda} tabular-nums`}>{fechaCorta(c.fecha)}</div>
                <div role="cell" className={`${celda} text-center tabular-nums`}>{c.consultas}</div>
                <div role="cell" className={celda}>{c.otrosUsos ?? <span className="text-muted-foreground">—</span>}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nadie ha consultado este documento en la página de verificación.</p>
        )}
      </div>
    </section>
  )
}
