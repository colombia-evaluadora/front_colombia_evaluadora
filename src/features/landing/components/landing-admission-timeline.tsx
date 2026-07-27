import { GraduationCapIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"

type TimelineStatus = "past" | "current" | "future"

interface TimelineStep {
  label: string
  date: string
  status: TimelineStatus
}

const TIMELINE_STEPS: TimelineStep[] = [
  { label: "Periodo de reservas", date: "hasta el\n4 de agosto", status: "past" },
  {
    label: "Periodo de inscripciones y pre matrículas",
    date: "5 al 28\nde agosto",
    status: "past",
  },
  { label: "Resultados parciales", date: "15 al 21\nde octubre", status: "current" },
  { label: "Resultados Lista de espera", date: "29 y 30\nde octubre", status: "future" },
  {
    label: "Período complementario de inscripción",
    date: "12 al 19 de\nnoviembre",
    status: "future",
  },
  { label: "Resultados generales", date: "2 de diciembre", status: "future" },
  { label: "Inicio matrículas", date: "9 al 30 de\ndiciembre", status: "future" },
]

interface TimelineCardProps {
  step: TimelineStep
  isFirst: boolean
  isLast: boolean
}

function TimelineCard({ step, isFirst, isLast }: TimelineCardProps) {
  const isPast = step.status === "past"
  const isCurrent = step.status === "current"

  return (
    <div className="relative h-40">
      <div
        className={`absolute inset-0 flex flex-col overflow-hidden rounded-2xl ${
          isCurrent ? "bg-yellow-400" : isPast ? "bg-gray-100" : "bg-blue-50"
        }`}
      >
        <div
          className={`flex flex-1 items-start justify-center px-3 py-4 text-center text-xs leading-snug ${
            isCurrent
              ? "font-semibold text-gray-900"
              : isPast
                ? "text-gray-400"
                : "text-gray-700"
          }`}
        >
          {step.label}
        </div>
        <div
          className={`flex flex-1 items-end justify-center bg-gray-100 px-3 pb-3 text-center text-xs leading-relaxed whitespace-pre-line ${
            isCurrent
              ? "font-semibold text-gray-900"
              : isPast
                ? "text-gray-500"
                : "text-gray-600"
          }`}
        >
          {step.date}
        </div>
      </div>

      <div className="absolute top-1/2 right-0 left-0 -translate-y-1/4">
        <div className="relative flex h-8 items-center justify-center">
          <div
            className={`absolute top-1/2 h-2 -translate-y-1/2 bg-[#3542B9] ${
              isFirst ? "left-0" : "-left-2"
            } ${isLast ? "right-0" : "-right-2"}`}
          />
          {isCurrent ? (
            <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-6 border-[#1e2a8a] bg-white">
              <div className="h-3 w-3 rounded-full bg-[#1e2a8a]" />
            </div>
          ) : (
            <div
              className={`relative z-10 h-9 w-9 rounded-full border-6 bg-white ${
                isPast ? "border-[#9b9fe8]" : "border-[#3542B9]"
              }`}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function LandingAdmissionTimeline() {
  return (
    <section className="bg-white py-20">
      <h2 className="mb-14 px-8 text-center text-2xl font-bold text-gray-900">
        Proceso de Admisión Escolar 2026
      </h2>

      <div className="grid grid-cols-2 gap-4 px-8 md:grid-cols-5 lg:grid-cols-7">
        {TIMELINE_STEPS.map((step, i) => (
          <TimelineCard
            key={step.label}
            step={step}
            isFirst={i === 0}
            isLast={i === TIMELINE_STEPS.length - 1}
          />
        ))}
      </div>

      <div className="mt-14 flex justify-center px-8">
        <Button>
          <GraduationCapIcon data-icon="inline-start" />
          Buscador de establecimientos
        </Button>
      </div>
    </section>
  )
}
