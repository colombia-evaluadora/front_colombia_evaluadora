import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
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

import {
  defaultHelpData,
  type HelpFaq,
  type HelpSection,
  type HelpSheetData,
  type HelpSupport,
} from "./help-faq-data"

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
            className="tracking-normal normal-case"
            aria-label={data.title}
          />
        }
      >
        <QuestionIcon weight="duotone" className="size-4.5 text-primary" aria-hidden="true" />
        <span>{data.title}</span>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>{data.title}</SheetTitle>
          <SheetDescription>{data.description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
          <HelpFaqSection title={data.faqsTitle} faqs={data.faqs} />

          {data.sections.map((section) => (
            <HelpLinkSection key={section.title} section={section} />
          ))}

          <Separator />

          <HelpSupportSection support={data.support} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function HelpBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function HelpFaqSection({ title, faqs }: { title: string; faqs: HelpFaq[] }) {
  return (
    <HelpBlock title={title}>
      <Accordion className="rounded-lg border">
        {faqs.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id}>
            <AccordionTrigger className="items-center gap-3 px-4">
              <ItemMedia variant="icon-lg">{faq.icon}</ItemMedia>
              <ItemContent>
                <ItemTitle>{faq.title}</ItemTitle>
                <ItemDescription>{faq.description}</ItemDescription>
              </ItemContent>
            </AccordionTrigger>
            <AccordionContent className="px-4 text-muted-foreground">{faq.body}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </HelpBlock>
  )
}

function HelpLinkSection({ section }: { section: HelpSection }) {
  return (
    <HelpBlock title={section.title}>
      <ItemGroup variant="list">
        {section.items.map((item) => (
          <Item key={item.title} render={<Link to={item.to} />}>
            <ItemMedia variant="icon-lg">{item.icon}</ItemMedia>
            <ItemContent>
              <ItemTitle>{item.title}</ItemTitle>
              <ItemDescription>{item.description}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <CaretRightIcon className="size-4 text-muted-foreground" />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </HelpBlock>
  )
}

function HelpSupportSection({ support }: { support: HelpSupport }) {
  return (
    <HelpBlock title="Soporte">
      <Item variant="outline" className="rounded-lg">
        <ItemMedia variant="icon-lg">{support.icon}</ItemMedia>
        <ItemContent>
          <ItemTitle>{support.title}</ItemTitle>
          <ItemDescription>
            <a href={`mailto:${support.email}`}>{support.email}</a>
          </ItemDescription>
          <ItemDescription>
            <a href={`tel:${support.phone.replace(/[^+\d]/g, "")}`}>{support.phone}</a>
          </ItemDescription>
          <ItemDescription>{support.hours}</ItemDescription>
        </ItemContent>
      </Item>
    </HelpBlock>
  )
}
