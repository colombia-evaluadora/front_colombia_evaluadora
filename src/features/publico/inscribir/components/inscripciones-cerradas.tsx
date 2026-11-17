import { CalendarDotsIcon } from "@/components/ui/icons"

const PASOS = [
  { titulo: "Datos del aspirante y su acudiente", texto: "Documento, nombre, domicilio, contacto y datos del acudiente." },
  {
    titulo: "Grado y opciones de cupo",
    texto: "El grado y hasta 3 opciones, de uno o de varios establecimientos, en orden de preferencia.",
  },
  { titulo: "Confirmación con código", texto: "Un código llega al correo del acudiente y vale 15 minutos." },
  { titulo: "Comprobante", texto: "Con el número de inscripción para consultarla." },
]

const TENGA_A_LA_MANO = [
  "Un correo del acudiente al que pueda acceder",
  "El tipo y número de documento del aspirante",
  "Su autorización para el tratamiento de datos (Ley 1581 de 2012)",
]

/** U.2: ningún establecimiento tiene hoy un período de inscripción iniciado. */
export function InscripcionesCerradas() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start gap-4">
        <span className="bg-orange/15 text-orange flex size-12 shrink-0 items-center justify-center rounded-full">
          <CalendarDotsIcon className="size-6" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Aún no se han habilitado las inscripciones</h2>
          <p className="text-muted-foreground text-sm">
            Ningún establecimiento tiene hoy un período de inscripción iniciado. Vuelva más adelante.
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">Así será la inscripción cuando se abra</h3>
        <ol>
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="relative flex gap-4 pb-5 last:pb-0">
              {i < PASOS.length - 1 && (
                <span aria-hidden className="bg-border absolute top-8 bottom-1 left-3 w-px" />
              )}
              <span className="bg-muted text-muted-foreground relative flex size-6 shrink-0 items-center justify-center rounded-full text-xs">
                {i + 1}
              </span>
              <div>
                <p className="text-muted-foreground text-sm">{p.titulo}</p>
                <p className="text-muted-foreground/80 mt-1 text-sm">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Tenga a la mano</h3>
        <ul className="list-disc pl-5 text-sm">
          {TENGA_A_LA_MANO.map((t) => (
            <li key={t} className="mt-1">
              {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
