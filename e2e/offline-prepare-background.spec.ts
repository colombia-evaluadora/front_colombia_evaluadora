import { expect, test, type Page } from "@playwright/test"

// "Preparar sin conexión" como trabajo en SEGUNDO PLANO: se arranca, el
// diálogo se cierra enseguida, el docente sigue navegando (las pantallas
// responden) y el progreso vive en el header hasta el toast de "Listo".
// También: el diálogo no tiene scroll horizontal en 360/768/desktop, y para un
// rol sin grupos (super admin) no muestra selectores vacíos.

const SHOTS = process.env.E2E_SHOTS_DIR

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` })
}

async function login(page: Page, email: string) {
  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        localStorage.clear()
        sessionStorage.clear()
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.reload()
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if (await compartido.isChecked()) await compartido.click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
  await page.waitForLoadState("networkidle")
}

async function openPrepareDialog(page: Page) {
  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Preparar para usar sin conexión" }).click()
  const dialog = page.getByRole("dialog", { name: "Preparar para usar sin conexión" })
  await expect(dialog).toBeVisible()
  return dialog
}

/** Navegación SPA (como un clic en el menú) y espera a que el router termine. */
async function ir(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState({}, "", p)
    dispatchEvent(new PopStateEvent("popstate"))
  }, path)
  await page.waitForFunction(
    () => {
      const router = (
        window as unknown as {
          __ceRouter?: {
            state: {
              status: string
              location: { href: string }
              resolvedLocation?: { href: string }
            }
          }
        }
      ).__ceRouter
      if (!router) return true
      return (
        router.state.status === "idle" &&
        router.state.resolvedLocation?.href === router.state.location.href
      )
    },
    undefined,
    { timeout: 60_000 },
  )
}

/** La pantalla responde: abrir y cerrar el menú de la cuenta tarda poco. */
async function expectInteractive(page: Page) {
  const t0 = Date.now()
  await page.getByRole("button", { name: "Cuenta de usuario" }).click({ timeout: 5_000 })
  await expect(page.getByRole("menuitem", { name: "Preparar para usar sin conexión" })).toBeVisible(
    { timeout: 5_000 },
  )
  await page.keyboard.press("Escape")
  expect(Date.now() - t0).toBeLessThan(5_000)
}

/** Sin scroll horizontal dentro del diálogo ni en la página. */
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const popup = document.querySelector('[data-slot="dialog-content"]') as HTMLElement | null
    // El diálogo entra entero en la pantalla y el header no ensancha la
    // página (a 360 px los íconos la ensanchaban ~100 px). El contenido de
    // cada pantalla detrás del diálogo no se mide acá.
    const rect = popup?.getBoundingClientRect()
    const header = document.querySelector("header")
    const headerRight = Math.max(
      0,
      ...[...(header?.querySelectorAll("*") ?? [])].map((el) => el.getBoundingClientRect().right),
    )
    return {
      dialog: popup ? popup.scrollWidth - popup.clientWidth : 0,
      page: Math.max(
        0,
        (rect?.right ?? 0) - window.innerWidth,
        rect ? -rect.left : 0,
        headerRight - window.innerWidth,
      ),
    }
  })
  expect(overflow.dialog).toBeLessThanOrEqual(1)
  expect(overflow.page).toBeLessThanOrEqual(1)
}

test("Preparar corre en segundo plano: se cierra el diálogo, se navega y el header muestra el progreso", async ({
  page,
}) => {
  test.setTimeout(480_000)
  await login(page, "docente@example.com")
  const dialog = await openPrepareDialog(page)
  await dialog.getByRole("button", { name: "Preparar todo" }).click()
  // El diálogo se cierra enseguida: no bloquea nada.
  await expect(dialog).toBeHidden()

  const chip = page.locator('[data-slot="offline-data-status"]')
  await expect(chip).toHaveAttribute("title", /^Preparando… \d+ %$/, { timeout: 15_000 })
  await shot(page, "bg-a-header-preparando")

  // Popover con detalle y Cancelar.
  await chip.click()
  const popover = page.locator('[data-slot="prepare-popover"]')
  await expect(popover.getByText("Preparando sin conexión")).toBeVisible()
  await expect(popover.getByRole("button", { name: "Cancelar" })).toBeVisible()
  await shot(page, "bg-b-popover")
  await page.keyboard.press("Escape")

  // Mientras corre, el docente usa otras pantallas.
  let vistasDuranteLaCorrida = 0
  for (const ruta of [
    "/app/planeador/actividades",
    "/app/asistencia",
    "/app/gestion-academica/informes",
  ]) {
    await ir(page, ruta)
    await expect(page.locator("main")).toBeVisible()
    await expectInteractive(page)
    if (/^Preparando/.test((await chip.getAttribute("title")) ?? "")) vistasDuranteLaCorrida++
  }
  expect(vistasDuranteLaCorrida).toBeGreaterThan(0)

  // Reabrir el diálogo muestra el progreso (si todavía corre).
  const otra = await openPrepareDialog(page)
  if (/^Preparando/.test((await chip.getAttribute("title")) ?? "")) {
    await expect(otra.getByText(/Preparando en segundo plano/)).toBeVisible()
    await shot(page, "bg-c-dialogo-progreso")
  }
  await otra.getByRole("button", { name: "Cerrar", exact: true }).first().click()

  // Al terminar: toast de "Listo" y el header vuelve a "Datos guardados".
  await expect(
    page.getByText(/Listo\. Este equipo puede usarse sin conexión\./).first(),
  ).toBeVisible({
    timeout: 300_000,
  })
  await shot(page, "bg-d-toast-listo")
  await expect(chip).toHaveAttribute("title", /^Datos guardados: hace/)
})

for (const [ancho, alto] of [
  [360, 740],
  [768, 1024],
  [1280, 800],
] as const) {
  test(`diálogo limpio a ${ancho}px: sin scroll horizontal, una acción principal y PIN con bordes`, async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: ancho, height: alto })
    await login(page, "docente@example.com")
    const dialog = await openPrepareDialog(page)
    await expect(dialog.getByRole("button", { name: "Preparar todo" })).toBeEnabled({
      timeout: 30_000,
    })
    // Solo "Cerrar" + la acción principal (más el botón X del diálogo y "Opciones").
    await expect(
      dialog.getByRole("button", { name: /Preparar todo el año|Continuar preparación/ }),
    ).toHaveCount(0)
    await expect(dialog.getByLabel(/^PIN/)).toBeVisible()
    const borde = await dialog
      .getByLabel(/^PIN/)
      .evaluate((el) => getComputedStyle(el).borderTopWidth)
    expect(parseFloat(borde)).toBeGreaterThan(0)
    await shot(page, `bg-dialogo-${ancho}`)
    await expectNoHorizontalOverflow(page)
    await dialog.getByRole("button", { name: "Opciones" }).click()
    await expect(dialog.getByRole("group", { name: "Grupos" })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await shot(page, `bg-dialogo-${ancho}-opciones`)
  })
}

test("super admin: sin selectores vacíos, una línea con lo que se guardará", async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 360, height: 740 })
  await login(page, "admin@example.com")
  const dialog = await openPrepareDialog(page)
  await expect(dialog.getByText(/Se guardará todo lo de tu menú/)).toBeVisible({ timeout: 30_000 })
  await dialog.getByRole("button", { name: "Opciones" }).click()
  await expect(dialog.getByText("Sin opciones.")).toHaveCount(0)
  await expect(dialog.getByRole("group", { name: "Grupos" })).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  await shot(page, "bg-dialogo-360-superadmin")
})
