import { Button } from "@/components/ui/button"

export function LandingReserveSection() {
  return (
    <section className="bg-white px-8 py-20 text-center">
      <h2 className="mb-4 text-2xl font-bold text-gray-900">Reserva de cupo</h2>
      <p className="mx-auto mb-8 max-w-xl leading-relaxed text-gray-600">
        Reserva tu cupo y asegura tu ingreso en nuestra institución, garantizando tu participación
        en el próximo periodo académico.
      </p>
      <Button>Reservar ahora</Button>
    </section>
  )
}
