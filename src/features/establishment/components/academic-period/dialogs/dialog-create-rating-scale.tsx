import { useState } from "react";
import { PlusCircleIcon, SpinnerIcon, TrashIcon } from "@/components/ui/icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useCreateRatingScale } from "../../../api/mutations/create-rating-scale";
import { useRatingSymbolsQuery } from "../../../api/query/use-rating-symbols-query";
import { useTeachingLevelsQuery } from "../../../api/query/use-teaching-levels-query";
import { RATING_SCALE_TYPES } from "../../../api/ui-mappings";
import type { RatingScaleType } from "../../../api/types/academic-period/rating-scales";
import { RatingSymbolSelect, RatingSymbolView } from "../rating-symbol";
import { TeachingLevelsMultiSelect } from "./teaching-levels-multi-select";

type Draft = {
  nombre: string;
  abreviacion: string;
  tipo: RatingScaleType;
  iconografia: string;
  notaMaxima: number;
  notaMinima: number;
  notaEquivalente: number;
};

const EMPTY_DRAFT: Draft = {
  nombre: "",
  abreviacion: "",
  tipo: "Fortaleza",
  iconografia: "",
  notaMaxima: 0,
  notaMinima: 0,
  notaEquivalente: 0,
};

interface CreateRatingScaleDialogProps {
  academicPeriodId?: number;
}

export function CreateRatingScaleDialog({
  academicPeriodId,
}: CreateRatingScaleDialogProps) {
  const [open, setOpen] = useState(false);
  const [continued, setContinued] = useState(false);
  const [teachingLevelIds, setTeachingLevelIds] = useState<number[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const { data: levels = [] } = useTeachingLevelsQuery();
  const { data: symbols = [] } = useRatingSymbolsQuery();
  const createScale = useCreateRatingScale();

  function reset() {
    setContinued(false);
    setTeachingLevelIds([]);
    setDraft(EMPTY_DRAFT);
    setDrafts([]);
  }

  function addDraft() {
    if (!draft.nombre || !draft.abreviacion || !draft.iconografia) {
      toast.error("Completá nombre, abreviación e iconografía.");
      return;
    }
    setDrafts((prev) => [...prev, draft]);
    setDraft(EMPTY_DRAFT);
  }

  async function handleSave() {
    if (teachingLevelIds.length === 0) {
      toast.error("Seleccioná al menos un nivel de enseñanza.");
      return;
    }
    if (drafts.length === 0) {
      toast.error("Agregá al menos una escala a la lista.");
      return;
    }
    await Promise.all(
      drafts.map((d) =>
        createScale.mutateAsync({
          ...d,
          codigo: 0,
          teachingLevelIds,
          teachingLevels: [],
          academicPeriodId,
        }),
      ),
    );
    toast.success(`${drafts.length} escala(s) guardada(s).`);
    reset();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button color="primary" size="sm" />}>
        <PlusCircleIcon weight="fill" data-icon="inline-start" />
        Agregar
      </DialogTrigger>
      <DialogContent className={continued ? "sm:max-w-4xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>Agregar escalas de valoración</DialogTitle>
          <DialogDescription>
            Elegí los niveles de enseñanza y agregá una o más escalas a la
            lista.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field variant="outlined">
            <FieldLabel htmlFor="rating-scale-levels">
              Niveles de enseñanza
            </FieldLabel>
            <TeachingLevelsMultiSelect
              id="rating-scale-levels"
              levels={levels}
              value={teachingLevelIds}
              onChange={setTeachingLevelIds}
            />
          </Field>

          {continued && (
            <>
              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                <Field variant="outlined">
                  <FieldLabel htmlFor="rs-nombre">Nombre*</FieldLabel>
                  <Input
                    id="rs-nombre"
                    placeholder="Agregar nombre"
                    value={draft.nombre}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, nombre: e.target.value }))
                    }
                  />
                </Field>

                <Field variant="outlined">
                  <FieldLabel htmlFor="rs-tipo">Tipo de valoración*</FieldLabel>
                  <Select
                    value={draft.tipo}
                    onValueChange={(value) =>
                      value &&
                      setDraft((d) => ({
                        ...d,
                        tipo: value as RatingScaleType,
                      }))
                    }
                  >
                    <SelectTrigger id="rs-tipo">
                      <SelectValue placeholder="Agregar valoración" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {RATING_SCALE_TYPES.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                <Field variant="outlined">
                  <FieldLabel htmlFor="rs-abrev">Abreviación*</FieldLabel>
                  <Input
                    id="rs-abrev"
                    placeholder="Agregar abreviación"
                    value={draft.abreviacion}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, abreviacion: e.target.value }))
                    }
                  />
                </Field>

                <Field variant="outlined">
                  <FieldLabel htmlFor="rs-icono">Iconografía*</FieldLabel>
                  <RatingSymbolSelect
                    id="rs-icono"
                    symbols={symbols}
                    value={draft.iconografia}
                    onChange={(valor) =>
                      setDraft((d) => ({ ...d, iconografia: valor }))
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-3">
                <Field variant="outlined">
                  <FieldLabel htmlFor="rs-max">Nota máximo*</FieldLabel>
                  <Input
                    id="rs-max"
                    type="number"
                    step="0.1"
                    value={draft.notaMaxima}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        notaMaxima: e.target.valueAsNumber || 0,
                      }))
                    }
                  />
                </Field>
                <Field variant="outlined">
                  <FieldLabel htmlFor="rs-min">Nota mínimo*</FieldLabel>
                  <Input
                    id="rs-min"
                    type="number"
                    step="0.1"
                    value={draft.notaMinima}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        notaMinima: e.target.valueAsNumber || 0,
                      }))
                    }
                  />
                </Field>
                <Field variant="outlined">
                  <FieldLabel htmlFor="rs-eq">Nota equivalente*</FieldLabel>
                  <Input
                    id="rs-eq"
                    type="number"
                    step="0.1"
                    value={draft.notaEquivalente}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        notaEquivalente: e.target.valueAsNumber || 0,
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDraft}
                >
                  <PlusCircleIcon data-icon="inline-start" />
                  Agregar a la lista
                </Button>
              </div>
            </>
          )}

          {drafts.length > 0 && (
            <div className="overflow-x-auto border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Abreviación</TableHead>
                    <TableHead>Nota máximo</TableHead>
                    <TableHead>Nota mínimo</TableHead>
                    <TableHead>Nota equivalente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Iconografía</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((d, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{d.nombre}</TableCell>
                      <TableCell>{d.abreviacion}</TableCell>
                      <TableCell>{d.notaMaxima}</TableCell>
                      <TableCell>{d.notaMinima}</TableCell>
                      <TableCell>{d.notaEquivalente}</TableCell>
                      <TableCell>{d.tipo}</TableCell>
                      <TableCell className="text-lg">
                        <RatingSymbolView value={d.iconografia} />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Quitar ${d.nombre}`}
                          onClick={() =>
                            setDrafts((prev) =>
                              prev.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <TrashIcon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-end">
          <DialogClose render={<Button type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
          {continued ? (
            <Button
              type="button"
              color="primary"
              onClick={handleSave}
              disabled={createScale.isPending}
              aria-busy={createScale.isPending}
            >
              {createScale.isPending && (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              )}
              Guardar
            </Button>
          ) : (
            teachingLevelIds.length > 0 && (
              <Button
                type="button"
                color="primary"
                onClick={() => setContinued(true)}
              >
                Continuar
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
