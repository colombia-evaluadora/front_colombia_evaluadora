import { chromium } from "playwright"

const BASE = "http://localhost:5173"
const browser = await chromium.launch({ args: ["--no-sandbox"] })
const page = await (await browser.newContext()).newPage()
page.on("console", (m) => { if (m.type() === "error") console.log("[console error]", m.text().slice(0, 200)) })

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" })
await page.waitForTimeout(800)
await page.fill('input[name="email"]', "admin@example.com")
await page.fill('input[name="password"]', "password")
await page.click('button[type="submit"]')
await page.waitForTimeout(2000)
console.log("URL after login:", page.url())

await page.goto(`${BASE}/app/planeador/actividades`, { waitUntil: "domcontentloaded" })
await page.waitForTimeout(2000)
console.log("URL now:", page.url())
await page.screenshot({ path: "verify-instrumento-page.png", fullPage: true })

const allAriaLabels = await page.locator("[aria-label]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))
console.log("aria-labels on page:", JSON.stringify(allAriaLabels))

await browser.close()
