import { Card } from "@/components/ui/card"
import { CalendarDotsIcon, ChatTextIcon, InfoIcon, PaperclipIcon } from "@/components/ui/icons"
import { useMomentoRegistroCatalog } from "@/features/planeador/api/query/catalogos-lista-valor"

const MOMENTOS_POR_DEFECTO = ["Inicio", "Proceso", "Cierre"]

/**
 * Bloque 5 alternativo para referentes con enfoque FORMATIVO (preescolar): reemplaza el bloque
 * de Evaluación. En preescolar no hay reprobación ni cálculo de notas, así que la actividad no
 * lleva instrumento, "¿Es sumativa?", peso ni puntaje (el backend los rechaza con 22023 en
 * `fn_actividad_validar_coherencia`). Es solo una previsualización de confirmación: el docente
 * registra la observación, el momento y la evidencia por estudiante después, en la Vista de
 * Registro de Resultados (`observacion-estudiante-sheet.tsx`). No agrega campos al formulario.
 */
export function SeguimientoFormativoSection() {
  const { data: momentos = [] } = useMomentoRegistroCatalog()
  const nombresMomento = momentos.length > 0 ? momentos.map((m) => m.nombre) : MOMENTOS_POR_DEFECTO

  const items = [
    {
      icon: ChatTextIcon,
      titulo: "Observación pedagógica",
      descripcion: "Registro narrativo de lo que el estudiante logró, cómo participó y qué necesita.",
    },
    {
      icon: CalendarDotsIcon,
      titulo: "Momento del registro",
      descripcion: nombresMomento.join(" · "),
    },
    {
      icon: PaperclipIcon,
      titulo: "Evidencia asociada",
      descripcion: "Fotografía, archivo o enlace que respalda la observación (opcional).",
    },
  ]

  return (
    <Card className="gap-4 p-4" data-testid="seguimiento-formativo">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">Seguimiento formativo · Registro narrativo</h3>
        <p className="text-sm text-muted-foreground">
          El referente de esta actividad es formativo: no se califica con nota, instrumento ni ponderación.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map(({ icon: Icon, titulo, descripcion }) => (
          <li key={titulo} className="flex gap-3 rounded-md border border-dashed p-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{titulo}</span>
              <span className="text-sm text-muted-foreground">{descripcion}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2 rounded-md bg-blue-22 p-3 text-sm">
        <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
        Después de guardar, registre estos datos por estudiante en la Vista de Registro de Resultados.
      </p>
    </Card>
  )
}
