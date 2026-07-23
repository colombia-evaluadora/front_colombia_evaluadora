import { useState } from "react"
import { PlusCircleIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { TabGradeGroups } from "../tabs/tab-grade-groups"
import { TabPromotionCriteria } from "../tabs/tab-promotion-criteria"
import { TabStudyPlan } from "../tabs/tab-study-plan"
import { ScheduleBuilder } from "../schedule/schedule-builder"
import type { Jornada } from "../schedule/schedule-data"

const NIVEL_OPTIONS = [
  "Preescolar",
  "Básica primaria",
  "Secundaria",
  "Educación media",
  "Educación superior",
]

const GRADO_SIGUIENTE_OPTIONS = [
  "Transición",
  "Primero",
  "Segundo",
  "Tercero",
  "Cuarto",
  "Quinto",
  "Sexto",
  "Séptimo",
  "Octavo",
  "Noveno",
  "Décimo",
  "Undécimo",
]

interface CreateGradeDialogProps {
  jornada: Jornada
}

export function CreateGradeDialog({ jornada }: CreateGradeDialogProps) {
  const [open, setOpen] = useState(false)

  const [nivel, setNivel] = useState("Preescolar")
  const [nombre, setNombre] = useState("Preescolar")
  const [gradoSiguiente, setGradoSiguiente] = useState("Primero")
  const [tieneGradoSiguiente, setTieneGradoSiguiente] = useState("si")

  function handleSave() {
    toast.success("Grado guardado.")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button color="primary" size="sm" />}>
        <PlusCircleIcon weight="fill" data-icon="inline-start" />
        Agregar
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Editar grado</DialogTitle>
        </DialogHeader>

        {/* Encabezado del grado */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="grade-nivel">Nivel de enseñanza*</FieldLabel>
            <Select value={nivel} onValueChange={(value) => value && setNivel(value)}>
              <SelectTrigger id="grade-nivel">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {NIVEL_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="grade-nombre">Nombre</FieldLabel>
            <Input
              id="grade-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="grade-siguiente">Grado siguiente</FieldLabel>
            <Select
              value={gradoSiguiente}
              onValueChange={(value) => value && setGradoSiguiente(value)}
            >
              <SelectTrigger id="grade-siguiente">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {GRADO_SIGUIENTE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Tiene grado siguiente</FieldLabel>
            <RadioGroup
              className="flex gap-6 pt-2"
              value={tieneGradoSiguiente}
              onValueChange={(value) => value && setTieneGradoSiguiente(value)}
            >
              <label className="flex items-center gap-2">
                <RadioGroupItem value="si" />
                Sí
              </label>
              <label className="flex items-center gap-2">
                <RadioGroupItem value="no" />
                No
              </label>
            </RadioGroup>
          </Field>
        </div>

        {/* Pestañas del grado */}
        <Tabs defaultValue="grupo" className="w-full">
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="grupo">Grupo</TabsTrigger>
            <TabsTrigger value="promocion">Criterios de promoción</TabsTrigger>
            <TabsTrigger value="plan">Plan de estudio</TabsTrigger>
            <TabsTrigger value="horario">Horario</TabsTrigger>
          </TabsList>

          <TabsContent value="grupo" className="mt-4">
            <TabGradeGroups />
          </TabsContent>

          <TabsContent value="promocion" className="mt-4">
            <TabPromotionCriteria hideSubmit />
          </TabsContent>

          <TabsContent value="plan" className="mt-4">
            <TabStudyPlan />
          </TabsContent>

          <TabsContent value="horario" className="mt-4">
            <ScheduleBuilder jornada={jornada} onClose={() => setOpen(false)} hideActions />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button type="button" color="primary" onClick={handleSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
