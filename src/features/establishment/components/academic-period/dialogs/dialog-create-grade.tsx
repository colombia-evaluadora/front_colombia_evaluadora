import { useState } from "react"
import { PlusCircleIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { TabPlaceholder } from "../tabs/tab-placeholder"
import { ScheduleBuilder } from "../schedule/schedule-builder"
import type { Jornada } from "../schedule/schedule-data"

const PLACEHOLDER_TABS = [
  { value: "grupo", label: "Grupo" },
  { value: "promocion", label: "Criterios de promoción" },
  { value: "plan", label: "Plan de estudio" },
]

interface CreateGradeDialogProps {
  jornada: Jornada
}

export function CreateGradeDialog({ jornada }: CreateGradeDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button color="primary" size="sm" />}>
        <PlusCircleIcon weight="fill" data-icon="inline-start" />
        Agregar
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Agregar grado</DialogTitle>
          <DialogDescription>
            Configurá la información del grado.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="grupo" className="w-full">
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            {PLACEHOLDER_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="horario">Horario</TabsTrigger>
          </TabsList>

          {PLACEHOLDER_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              <TabPlaceholder />
            </TabsContent>
          ))}

          <TabsContent value="horario" className="mt-4">
            <ScheduleBuilder jornada={jornada} onClose={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
