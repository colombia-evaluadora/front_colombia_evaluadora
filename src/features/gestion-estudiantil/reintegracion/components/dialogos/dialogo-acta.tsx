import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileTextIcon, InfoIcon } from "@/components/ui/icons"

import {
  DatosDocumento,
  DialogoDocumento,
  Firma,
  SeccionDocumento,
} from "@/features/gestion-estudiantil/commons/components/documento-imprimible"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { formatFecha, formatFechaHora } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useGenerarActa } from "@/features/gestion-estudiantil/reintegracion/api/mutations/casos"
import type { ActaRetiro, CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { ResumenCasoDialogo } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/resumen-caso-dialogo"

/** Hoja del acta de retiro (§10.1), de solo datos: Encabezado, Novedad, Estudiante, Razones, SIMPADE y Firmas. */
function HojaActa({ a }: { a: ActaRetiro }) {
  const blanco = "________________________"
  return (
    // El id lo usa la regla de impresión de `DialogoDocumento`: al imprimir solo sale esta hoja.
    <article id="documento-imprimible" className="flex flex-col gap-4 rounded-md border border-border bg-background p-6 text-sm">
      <header className="flex items-start justify-between gap-4 border-t-4 border-primary pt-4">
        <p className="text-lg font-semibold text-primary">{a.encabezado.establecimiento}</p>
        <p className="text-right text-xs text-muted-foreground">
          Acta N.º {a.encabezado.numero}
          <br />
          Generada el {formatFechaHora(a.encabezado.fecha_generacion)}
        </p>
      </header>
      <h3 className="text-center text-base font-semibold tracking-wide text-primary uppercase">{a.encabezado.titulo}</h3>

      <SeccionDocumento titulo="Novedad">
        <DatosDocumento
          filas={[
            ["Motivo de la novedad", a.novedad.motivo_novedad ?? "—"],
            ["Fecha de retiro", formatFecha(a.novedad.fecha_retiro) || "—"],
            ["Motivo de retiro", a.novedad.motivo_retiro ?? "—"],
          ]}
        />
      </SeccionDocumento>

      <SeccionDocumento titulo="Estudiante">
        <DatosDocumento
          filas={[
            ["Nombre", a.estudiante.nombre],
            ["Documento", `${a.estudiante.tipo_documento} ${a.estudiante.documento}`],
            ["Sede", a.estudiante.sede],
            ["Jornada", a.estudiante.jornada],
            ["Grado", a.estudiante.grado],
            ["Grupo", a.estudiante.grupo],
            ["Teléfono", a.estudiante.telefono ?? "—"],
          ]}
        />
      </SeccionDocumento>

      <SeccionDocumento titulo="Razones del abandono">
        {a.razones.length === 0 && !a.otra_razon ? (
          <p>—</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {a.razones.map((g) => (
              <li key={g.dimension_valor}>
                <strong className="font-semibold">{g.dimension_nombre}:</strong>{" "}
                {g.razones.map((r) => r.nombre).join(", ")}
              </li>
            ))}
            {a.otra_razon && (
              <li>
                <strong className="font-semibold">Otra razón:</strong> {a.otra_razon}
              </li>
            )}
          </ul>
        )}
      </SeccionDocumento>

      <SeccionDocumento titulo="Observaciones">
        <p className="whitespace-pre-line">{a.observaciones || "—"}</p>
      </SeccionDocumento>

      <SeccionDocumento titulo="Ingreso al SIMPADE">
        <DatosDocumento
          filas={[
            ["Fecha de ingreso", a.simpade?.fecha_ingreso ? formatFecha(a.simpade.fecha_ingreso) : blanco],
            ["Digitado por", a.simpade?.digitado_por ?? blanco],
          ]}
        />
      </SeccionDocumento>

      <SeccionDocumento titulo="Firmas">
        <div className="grid grid-cols-1 gap-8 pt-10 sm:grid-cols-3">
          <Firma nombre={a.firmas.funcionario ?? blanco} rol="Funcionario del establecimiento" />
          <Firma
            nombre={a.firmas.acudiente.nombre ?? blanco}
            rol={[
              "Acudiente",
              a.firmas.acudiente.parentesco,
              a.firmas.acudiente.documento ? `Documento ${a.firmas.acudiente.documento}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <Firma nombre={a.firmas.digita_simpade ?? blanco} rol="Quien digita en el SIMPADE" />
        </div>
      </SeccionDocumento>
    </article>
  )
}

/**
 * Generar acta de retiro: primero confirma (la primera vez asigna el número de acta), luego muestra la vista
 * imprimible del documento. El PDF de reporting-service no existe para el acta: se imprime desde el navegador.
 */
export function DialogoActa({ caso: c, onClose }: { caso: CasoDetalle; onClose: () => void }) {
  const s = useEstadoDialogo()
  const [acta, setActa] = useState<ActaRetiro | null>(null)
  const mut = useGenerarActa({
    mutationConfig: {
      onSuccess: setActa,
      onError: (e: Error) => s.setError(e),
    },
  })

  if (acta)
    return (
      <DialogoDocumento titulo="Acta de retiro del estudiante" isPending={false} error={null} onClose={onClose}>
        <HojaActa a={acta} />
      </DialogoDocumento>
    )

  return (
    <DialogoOperacionShell
      titulo={`Generar acta de retiro — ${c.estudiante_nombre}`}
      resumen={<ResumenCasoDialogo caso={c} conRetiro />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Generar acta",
        icon: <FileTextIcon data-icon="inline-start" />,
        onClick: () => {
          s.setError(null)
          mut.mutate({ id: c.id })
        },
      }}
    >
      <Alert>
        <InfoIcon aria-hidden="true" />
        <AlertDescription>
          {c.acta
            ? `El acta conserva su número (${c.acta.numero}) y se vuelve a generar con las razones actuales.`
            : "La primera vez se asigna el número de acta del establecimiento y el año."}
        </AlertDescription>
      </Alert>
    </DialogoOperacionShell>
  )
}
