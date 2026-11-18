import { useState } from "react"

import { PublicBand } from "@/components/public/public-page"
import { MagnifyingGlassIcon } from "@/components/ui/icons"

import { FormularioConsulta } from "@/features/publico/consultar/components/formulario-consulta"
import { ResultadoInscripcion } from "@/features/publico/consultar/components/resultado-inscripcion"
import { SUBTITULO_ESTADO } from "@/features/publico/consultar/ui-mappings"
import type { EstadoInscripcionPublica, InscripcionConsulta } from "@/features/publico/consultar/datos-demo"

const BREADCRUMB = ["Consultar inscripción"]
const PUNTOS = ["Estado de cada opción de cupo", "Elija o anule su inscripción", "Código a su correo, válido 15 minutos"]

/**
 * U.3 Consultar inscripción (sitio público). Mismo marco que Inscribir: franja
 * de color con el título y la tarjeta central; primero los datos y el código,
 * después el estado de la inscripción.
 */
export function ConsultarInscripcionPage() {
  const [inscripcion, setInscripcion] = useState<InscripcionConsulta | null>(null)
  const [estado, setEstado] = useState<EstadoInscripcionPublica | null>(null)

  if (!inscripcion) {
    return (
      <PublicBand
        icon={MagnifyingGlassIcon}
        title="Consultar inscripción"
        subtitle="Con el número de inscripción y el documento del aspirante."
        points={PUNTOS}
        breadcrumb={BREADCRUMB}
        width="md"
        backToHome
      >
        <FormularioConsulta
          onEncontrada={(i) => {
            setInscripcion(i)
            setEstado(i.estado)
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
        />
      </PublicBand>
    )
  }

  return (
    <PublicBand
      icon={MagnifyingGlassIcon}
      title="Consultar inscripción"
      subtitle={SUBTITULO_ESTADO[estado ?? inscripcion.estado]}
      breadcrumb={BREADCRUMB}
      width="xl"
      backToHome
    >
      <ResultadoInscripcion
        inicial={inscripcion}
        onEstadoChange={setEstado}
        onNuevaConsulta={() => {
          setInscripcion(null)
          setEstado(null)
          window.scrollTo({ top: 0, behavior: "smooth" })
        }}
      />
    </PublicBand>
  )
}
