import { chromium } from "playwright"

const BASE = "http://localhost:5173"
const browser = await chromium.launch({ args: ["--no-sandbox"] })
const page = await (await browser.newContext()).newPage()

page.on("response", async (res) => {
  if (res.url().includes("/auth/login")) {
    console.log("LOGIN RESPONSE", res.status(), await res.text().catch(() => "<no body>"))
  }
})

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" })
await page.waitForTimeout(1500)
await page.fill('input[name="email"]', "admin@example.com")
await page.fill('input[name="password"]', "password")
console.log("email value:", await page.inputValue('input[name="email"]'))
console.log("password value:", await page.inputValue('input[name="password"]'))
await page.click('button[type="submit"]')
await page.waitForTimeout(2500)
console.log("URL after login:", page.url())

await browser.close()
