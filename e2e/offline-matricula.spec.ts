import { expect, test, type Page } from "@playwright/test"

// P6 (política de datos de menores, decidida para Cobertura): la LISTA de
// matrícula se consulta sin red, solo lectura y con datos básicos. Después de
// "Preparar": sin red la lista se ve, el detalle muestra el aviso estándar de
// vista solo en línea y lo guardado en IndexedDB (descifrado con la bóveda de
// la app) no tiene acudiente ni ningún campo fuera de la lista blanca.
// "Sin red" = API caída por MSW (`sessionStorage["msw:fault"] = "network"`).

const VACIO = "Esta sección necesita conexión"
const USUARIO = "admin@example.com" // el menú del administrador incluye Matrícula

interface MatriculaFila {
  id: string
  firstName: string
  lastName: string
  guardian?: string
}

async function ir(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState({}, "", p)
    dispatchEvent(new PopStateEvent("popstate"))
  }, path)
  await page.waitForFunction(
    () => {
      const router = (window as unknown as {
        __ceRouter?: { state: { status: string; location: { href: string }; resolvedLocation?: { href: string } } }
      }).__ceRouter
      if (!router) return true
      return router.state.status === "idle" && router.state.resolvedLocation?.href === router.state.location.href
    },
    null,
    { timeout: 60_000, polling: 100 },
  )
}

/** Filas de la lista de matrícula que hay en memoria (la pantalla con red). */
async function filasEnMemoria(page: Page): Promise<MatriculaFila[]> {
  return page.evaluate(() => {
    const client = (window as unknown as {
      __ceQueryClient: { getQueryCache(): { getAll(): { queryKey: unknown[]; state: { data: unknown } }[] } }
    }).__ceQueryClient
    return client
      .getQueryCache()
      .getAll()
      .filter((q) => q.queryKey[0] === "matricula" && q.queryKey[1] === "lista")
      .flatMap((q) => ((q.state.data as { rows?: MatriculaFila[] } | undefined)?.rows ?? []))
  })
}

/**
 * Filas de `ce-offline.queries` de la lista de matrícula, descifradas con la
 * bóveda de la app (mismo módulo que usa el persister en Vite dev).
 */
async function matriculaEnIndexedDb(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const vault = (await import(/* @vite-ignore */ "/src/lib/offline/vault.ts")) as {
      openString: (value: string) => Promise<string>
    }
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("ce-offline")
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const filas = await new Promise<{ queryKey: unknown[]; data: string }[]>((resolve, reject) => {
      const req = db.transaction("queries").objectStore("queries").getAll()
      req.onsuccess = () => resolve(req.result as { queryKey: unknown[]; data: string }[])
      req.onerror = () => reject(req.error)
    })
    db.close()
    const deMatricula = filas.filter((f) => f.queryKey[0] === "matricula" && f.queryKey[1] === "lista")
    return Promise.all(deMatricula.map((f) => vault.openString(f.data)))
  })
}

const LISTA_BLANCA = [
  "id",
  "documentType",
  "documentNumber",
  "firstName",
  "lastName",
  "institution",
  "campus",
  "shift",
  "educationLevel",
  "grade",
  "group",
  "status",
  "enrollmentDate",
]

test("matrícula: preparar → sin red se consulta la lista con datos básicos; el detalle pide conexión", async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  // En Vite dev, el primer acceso puede recargar la página (optimización de
  // dependencias) y devolver al login: se reintenta.
  await expect(async () => {
    if (new URL(page.url()).pathname !== "/login") await page.goto("/login")
    await page.getByLabel("Correo electrónico").fill(USUARIO)
    await page.getByLabel("Contraseña", { exact: true }).fill("password")
    const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
    if (await compartido.isChecked()) await compartido.click()
    await page.getByRole("button", { name: "Ingresar" }).click()
    // La app terminó de arrancar (sesión, menú) antes de navegar por el router.
    await expect(page.getByRole("button", { name: "Cuenta de usuario" })).toBeVisible({ timeout: 45_000 })
  }).toPass({ timeout: 180_000 })

  // Con red: la pantalla muestra todo, incluido el acudiente.
  await ir(page, "/app/cobertura/matricula")
  await expect(page.getByRole("columnheader", { name: "Acudiente" })).toBeVisible({ timeout: 30_000 })
  await expect.poll(async () => (await filasEnMemoria(page)).length, { timeout: 30_000 }).toBeGreaterThan(0)
  const enLinea = await filasEnMemoria(page)
  const acudientes = [...new Set(enLinea.map((f) => f.guardian).filter((g): g is string => Boolean(g)))]
  expect(acudientes.length, "el mock trae acudientes en la lista").toBeGreaterThan(0)
  await expect(page.getByRole("cell", { name: acudientes[0] }).first()).toBeVisible()

  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Preparar para usar sin conexión" }).click()
  const dialog = page.getByRole("dialog", { name: "Preparar para usar sin conexión" })
  await dialog.getByRole("button", { name: "Preparar todo" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(/Listo. Este equipo puede usarse sin conexión./).first()).toBeVisible({ timeout: 300_000 })
  // El persister escribe con throttle de 1 s.
  await page.waitForTimeout(2_500)

  // IndexedDB: solo campos de la lista blanca, ningún acudiente.
  const guardados = await matriculaEnIndexedDb(page)
  expect(guardados.length, "la vista por defecto quedó guardada").toBeGreaterThan(0)
  for (const json of guardados) {
    const data = JSON.parse(json) as { rows: Record<string, unknown>[] } & Record<string, unknown>
    expect(Object.keys(data).sort()).toEqual(["pageCount", "rows", "totalCount"])
    expect(data.rows.length).toBeGreaterThan(0)
    for (const fila of data.rows) {
      for (const clave of Object.keys(fila)) expect(LISTA_BLANCA, `clave persistida: ${clave}`).toContain(clave)
    }
    for (const acudiente of acudientes) expect(json).not.toContain(acudiente)
    expect(json).not.toContain("guardian")
  }

  // Sin red.
  await page.evaluate(() => sessionStorage.setItem("msw:fault", "network"))
  await page.reload()
  await expect(page.getByRole("status").filter({ hasText: /sin conexión/i }).first()).toBeVisible({ timeout: 60_000 })

  await ir(page, "/app/cobertura/matricula")
  await page.waitForTimeout(2_000)
  expect(new URL(page.url()).pathname).toBe("/app/cobertura/matricula")
  await expect(page.getByText(VACIO)).toHaveCount(0)
  const primera = enLinea[0]
    await expect(page.getByRole("cell", { name: primera.firstName, exact: true }).first()).toBeVisible({ timeout: 30_000 })
  // Lo restaurado no trae acudiente.
  for (const acudiente of acudientes) await expect(page.getByRole("cell", { name: acudiente })).toHaveCount(0)
  // Solo consulta: agregar y exportar quedan deshabilitados.
  await expect(page.locator("[data-online-only]").filter({ hasText: "Agregar estudiante" })).toBeVisible()

  // El detalle sigue solo en línea: aviso estándar.
  // (La columna de acciones es un overlay que aparece al pasar el mouse: se
  // navega directo a la ruta del botón "Ver".)
  await ir(page, `/app/cobertura/matricula/detalle/${primera.id}`)
  await expect(page).toHaveURL(/\/app\/cobertura\/matricula\/detalle\//)
  await expect(page.getByText(VACIO).first()).toBeVisible({ timeout: 30_000 })
})
