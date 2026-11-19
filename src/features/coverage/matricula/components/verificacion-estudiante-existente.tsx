import { Button } from "@/components/ui/button"
import { IdentificationCardIcon, WarningIcon } from "@/components/ui/icons"
import type { EstudianteExistente } from "@/features/coverage/matricula/api/query/use-estudiante-existente"

const fecha = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "—")

interface VerificacionEstudianteExistenteProps {
  estudiante: EstudianteExistente
  documento: string
  /** Grado elegido distinto al del traslado (AGR.2): se muestra el aviso. */
  gradoDistintoTraslado?: boolean
  onUsarGradoTraslado?: () => void
}

/**
 * Verificación de identidad (Regla 8): al reconocer el documento se muestran
 * los datos para confirmar que es el estudiante, con el acudiente de su última
 * matrícula (correo y teléfono enmascarados).
 */
export function VerificacionEstudianteExistente({
  estudiante,
  documento,
  gradoDistintoTraslado,
  onUsarGradoTraslado,
}: VerificacionEstudianteExistenteProps) {
  const nombre = [estudiante.firstName, estudiante.secondName, estudiante.lastName, estudiante.secondLastName]
    .filter(Boolean)
    .join(" ")
  const acudiente = estudiante.ultimoAcudiente
  const { traslado } = estudiante
  return (
    <section aria-label="Estudiante ya registrado" className="flex flex-col gap-3">
      <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary-22 px-4 py-3 text-sm">
        <IdentificationCardIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-medium">El estudiante ya existe en la plataforma. Confirme que es él:</p>
          <p>
            {[`${estudiante.tipoDocumento} ${documento}`.trim(), nombre, fecha(estudiante.birthDate)].join(" · ")}
          </p>
          {acudiente ? (
            <p>
              Acudiente de su última matrícula:{" "}
              {[acudiente.parentesco, acudiente.nombre, acudiente.correoEnmascarado, acudiente.telefonoEnmascarado]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            Sus datos de identidad están protegidos. Para corregirlos se usa Corregir datos de identidad.
          </p>
        </div>
      </div>
      {traslado && gradoDistintoTraslado ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-yellow-stroke bg-yellow-22 px-4 py-3 text-sm"
        >
          <WarningIcon className="mt-0.5 size-5 shrink-0 text-yellow" aria-hidden />
          <div className="flex flex-col gap-2">
            <p className="font-medium">
              El estudiante viene de {traslado.institucion}, donde cursaba {traslado.gradoNombre}. Por traslado, debe
              matricularse en el mismo grado.
            </p>
            <p>
              Su matrícula allí está Retirada ({traslado.periodo}). Si debe estar en otro grado, se matricula en{" "}
              {traslado.gradoNombre} y después se hace un cambio de grado.
            </p>
            <Button type="button" variant="outline" color="neutral" size="sm" className="w-fit" onClick={onUsarGradoTraslado}>
              Cambiar el grado a {traslado.gradoNombre}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
