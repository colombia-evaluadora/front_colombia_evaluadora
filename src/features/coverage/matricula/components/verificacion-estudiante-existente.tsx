import { IdentificationCardIcon } from "@/components/ui/icons"
import type { EstudianteExistente } from "@/features/coverage/matricula/api/query/use-estudiante-existente"

const fecha = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "—")

/**
 * Verificación de identidad (Regla 8): al reconocer el documento, se muestran
 * los datos para confirmar que es el estudiante correcto, con el acudiente de su
 * última matrícula. Correo y teléfono, parcialmente enmascarados.
 */
export function VerificacionEstudianteExistente({ estudiante }: { estudiante: EstudianteExistente }) {
  const nombre = [estudiante.firstName, estudiante.secondName, estudiante.lastName, estudiante.secondLastName]
    .filter(Boolean)
    .join(" ")
  const filas: [string, string][] = [
    ["Nombre", nombre],
    ["Fecha de nacimiento", fecha(estudiante.birthDate)],
    ["Correo", estudiante.correoEnmascarado || "—"],
    ["Teléfono", estudiante.telefonoEnmascarado || "—"],
    [
      "Acudiente de su última matrícula",
      estudiante.ultimoAcudiente
        ? `${estudiante.ultimoAcudiente.nombre} (${estudiante.ultimoAcudiente.parentesco})`
        : "Sin matrícula anterior",
    ],
  ]
  return (
    <section
      aria-label="Estudiante ya registrado"
      className="flex flex-col gap-3 rounded-md border border-primary/30 bg-primary-22 px-4 py-3 text-sm"
    >
      <div className="flex items-start gap-3">
        <IdentificationCardIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <p>
          <span className="font-medium">Este documento ya está registrado.</span> Confirme que es el estudiante correcto.
          Su identidad queda en solo lectura; si hay un error, se corrige después con Corregir datos de identidad. Los
          demás datos vienen de su última matrícula para revisarlos.
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
        {filas.map(([label, valor]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
