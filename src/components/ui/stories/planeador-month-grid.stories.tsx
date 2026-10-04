import preview from "../../../../.storybook/preview"
import { useState } from "react"

import {
  PlaneadorMonthGrid,
  type DayEvent,
} from "@/features/planeador/components/planeador-month-grid"

const meta = preview.meta({
  title: "Design System/Forms/Calendar/PlaneadorMonthGrid",
  component: PlaneadorMonthGrid,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Grilla mensual del Planeador. Decorativa — no es selector — que lista las actividades de cada día como filas: barra de color del estado, código de 3 dígitos y asignatura. Misma grilla que usa `/app/planeador`.",
      },
    },
  },
})

function WithEvents() {
  const [month, setMonth] = useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const events = new Map<number, DayEvent[]>([
    [3, [{ id: 1, code: "601", label: "Cognitiva", status: "completed" }]],
    [
      10,
      [
        { id: 2, code: "602", label: "Comunicativa", status: "in-progress" },
        { id: 3, code: "603", label: "Artística", status: "pending" },
      ],
    ],
    [15, [{ id: 4, code: "604", label: "Natural", status: "cancelled" }]],
    // Día con código repetido (604 dos veces) y una cuarta actividad que
    // cae en el "+1 más".
    [
      16,
      [
        { id: 5, code: "603", label: "Artística", status: "pending" },
        { id: 6, code: "604", label: "Natural", status: "pending" },
        { id: 7, code: "604", label: "Cognitiva", status: "pending" },
        { id: 8, code: "602", label: "Comunicativa", status: "in-progress" },
      ],
    ],
    [
      18,
      [
        { id: 9, code: "601", label: "Cognitiva", status: "completed" },
        { id: 10, code: "602", label: "Comunicativa", status: "in-progress" },
        { id: 11, code: "603", label: "Artística", status: "pending" },
      ],
    ],
    [22, [{ id: 12, code: "605", label: "Corporal", status: "pending" }]],
    [
      28,
      [
        { id: 13, code: "601", label: "Cognitiva", status: "completed" },
        { id: 14, code: "607", label: "Natural", status: "cancelled" },
        { id: 15, code: "608", label: "Artística", status: "in-progress" },
      ],
    ],
  ])
  return <PlaneadorMonthGrid month={month} events={events} onMonthChange={setMonth} />
}

function Empty() {
  const [month, setMonth] = useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  return <PlaneadorMonthGrid month={month} events={new Map()} onMonthChange={setMonth} />
}

export const WithEventsStory = meta.story({
  render: () => <WithEvents />,
})

export const EmptyStory = meta.story({
  render: () => <Empty />,
})
