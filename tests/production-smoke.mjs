import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const root = path.resolve("dist");
const config = JSON.parse(await readFile("vercel.json", "utf8"));
const headers = Object.fromEntries(
  config.headers[0].headers.map(({ key, value }) => [key, value]),
);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    let filename = path.resolve(root, "." + pathname);
    if (!filename.startsWith(root + path.sep) && filename !== root) {
      response.writeHead(403);
      response.end();
      return;
    }
    try {
      if (!(await stat(filename)).isFile())
        filename = path.join(root, "index.html");
    } catch {
      filename = path.join(root, "index.html");
    }
    const routeHeaders = Object.fromEntries(
      config.headers
        .filter((rule) => rule.source === pathname)
        .flatMap((rule) => rule.headers.map(({ key, value }) => [key, value])),
    );
    response.writeHead(200, {
      ...headers,
      ...routeHeaders,
      "Content-Type":
        types[path.extname(filename)] || "application/octet-stream",
    });
    response.end(await readFile(filename));
  } catch {
    response.writeHead(500);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const errors = [];
  const violations = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.exposeFunction("policyViolation", (directive) =>
    violations.push(directive),
  );
  await page.addInitScript(() =>
    document.addEventListener("securitypolicyviolation", (event) =>
      window.policyViolation(event.violatedDirective),
    ),
  );
  const loginHeaders = await fetch(
    `http://127.0.0.1:${server.address().port}/login`,
  );
  assert.ok(loginHeaders.headers.get("x-robots-tag")?.includes("noindex"));
  await page.goto(`http://127.0.0.1:${server.address().port}/`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("heading", { name: "Experiences that matter." })
    .waitFor();
  assert.equal(await page.locator('a[href="/login"]').count(), 0);
  await page
    .getByRole("button", { name: "Book a demo", exact: true })
    .first()
    .click();
  assert.equal(
    await page.getByRole("button", { name: "Request my demo" }).isDisabled(),
    true,
  );
  assert.ok(
    (
      await page
        .getByRole("link", { name: "Email the team instead", exact: false })
        .getAttribute("href")
    ).startsWith("mailto:revora.org.com@gmail.com"),
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Try it yourself", exact: true })
    .first()
    .click();
  const frame = page.frameLocator('iframe[title="REVORA guest review demo"]');
  await frame.locator("#continue").waitFor();
  await frame.locator("#continue").click();
  await frame.locator("#step2").waitFor({ state: "visible" });
  assert.deepEqual(errors, []);
  assert.deepEqual(violations, []);
  console.log(
    "PASS: production homepage, unavailable-backend handling, manual email, embedded demo, and Vercel CSP",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
