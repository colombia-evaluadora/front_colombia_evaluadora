import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Link } from "@tanstack/react-router"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { CaretRightIcon, QuestionIcon } from "@/components/ui/icons"

import { defaultHelpData, type HelpSheetData } from "./help-faq-data"

export function HelpFaqSheet({ data = defaultHelpData }: { data?: HelpSheetData }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="link"
            color="primary"
            size="sm"
            className="normal-case tracking-normal"
            aria-label={data.title}
          />
        }
      >
        <QuestionIcon weight="duotone" className="text-primary size-4.5" aria-hidden="true" />
        <span>{data.title}</span>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>{data.title}</SheetTitle>
          <SheetDescription>{data.description}</SheetDescription>
        </SheetHeader>

        <HelpFaqSheetContent data={data} />
      </SheetContent>
    </Sheet>
  )
}

function HelpFaqSheetContent({ data }: { data: HelpSheetData }) {
  return (
    <div className="space-y-6 px-6 pb-6 flex-1 overflow-y-auto">
      <section className="space-y-4">
        <h3 className="px-1 text-base font-semibold">¿No puedes iniciar sesión?</h3>
        <Accordion className="border rounded-lg">
          {data.faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="px-4">
                <div className="flex flex-1 items-center gap-3">
                  <span className="shrink-0 [&_svg:not([class*='size-'])]:size-6">{faq.icon}</span>
                  <div className="flex min-w-0 flex-col gap-0.5 text-left">
                    <span className="text-sm font-semibold">{faq.title}</span>
                    <span className="text-muted-foreground text-xs font-normal leading-snug">
                      {faq.description}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="text-muted-foreground px-4 pb-4 text-sm leading-relaxed">
                  {faq.body}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {data.sections.map((section) => (
        <section key={section.title} className="space-y-4">
          <h3 className="px-1 text-base font-semibold">{section.title}</h3>
          <ItemGroup>
            {section.items.map((item) => (
              <Item
                key={item.title}
                variant="outline"
                render={item.to ? <Link to={item.to} /> : undefined}
              >
                <ItemMedia
                  variant="icon"
                  className="group-has-data-[slot=item-description]/item:translate-y-0 group-has-data-[slot=item-description]/item:self-center [&_svg:not([class*='size-'])]:size-6"
                >
                  {item.icon}
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{item.title}</ItemTitle>
                  <ItemDescription>{item.description}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <CaretRightIcon className="text-muted-foreground size-4" />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </section>
      ))}

      <Separator />
      <section className="space-y-4">
        <h3 className="px-1 text-base font-semibold">Soporte</h3>
        <Item variant="outline">
          <ItemMedia
            variant="icon"
            className="group-has-data-[slot=item-description]/item:translate-y-0 group-has-data-[slot=item-description]/item:self-center [&_svg:not([class*='size-'])]:size-6"
          >
            {data.support.icon}
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="!text-sm !font-semibold normal-case !tracking-normal">
              {data.support.title}
            </ItemTitle>
            <div className="text-muted-foreground space-y-1 text-sm leading-relaxed">
              <p>
                <a
                  className="hover:text-foreground underline underline-offset-3"
                  href={`mailto:${data.support.email}`}
                >
                  {data.support.email}
                </a>
              </p>
              <p>
                <a
                  className="hover:text-foreground underline underline-offset-3"
                  href={`tel:${data.support.phone.replace(/[^+\d]/g, "")}`}
                >
                  {data.support.phone}
                </a>
              </p>
              <p>{data.support.hours}</p>
            </div>
          </ItemContent>
        </Item>
      </section>
    </div>
  )
}
