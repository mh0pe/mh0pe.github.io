import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = (process.env.PORTFOLIO_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const outputDir =
  process.argv[2] ?? join(tmpdir(), "portfolio-viewport-audit");

const routes = [
  "/",
  "/work/",
  "/work/automated-security-helper/",
  "/work/cloudformation-guard/",
  "/work/nix-windows/",
  "/work/agent-systems/",
  "/capabilities/",
  "/method/",
  "/decisions/",
  "/about/",
  "/credentials/",
  "/proof/",
  "/models/",
  "/evidence/",
  "/career/",
  "/404.html",
];

const viewports = [
  { height: 568, key: "phone-small", width: 320 },
  { height: 844, key: "phone", width: 390 },
  { height: 450, key: "phone-landscape", width: 720 },
  { height: 1024, key: "tablet", width: 768 },
  { height: 768, key: "laptop", width: 1024 },
  { height: 1000, key: "desktop", width: 1440 },
];

const themes = ["light", "dark"];

await access(chromePath);
await mkdir(outputDir, { recursive: true });

const profileRoot = await mkdtemp(
  join(process.env.TMPDIR ?? tmpdir(), "portfolio-chrome-"),
);
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--hide-scrollbars",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileRoot}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readDebuggerPort() {
  const portFile = join(profileRoot, "DevToolsActivePort");
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const [port] = (await readFile(portFile, "utf8")).trim().split("\n");
      if (port) return Number(port);
    } catch {}
    await delay(50);
  }
  throw new Error("Chrome did not publish a debugging port.");
}

const debuggerPort = await readDebuggerPort();
const targets = await fetch(`http://127.0.0.1:${debuggerPort}/json/list`).then(
  (response) => response.json(),
);
const pageTarget = targets.find((target) => target.type === "page");
if (!pageTarget?.webSocketDebuggerUrl) {
  throw new Error("Chrome did not expose a page target.");
}

const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let commandId = 0;
const pending = new Map();
const eventWaiters = new Map();

socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (message.id) {
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
    return;
  }

  const waiters = eventWaiters.get(message.method) ?? [];
  eventWaiters.delete(message.method);
  for (const resolve of waiters) resolve(message.params);
});

function command(method, params = {}) {
  commandId += 1;
  const id = commandId;
  return new Promise((resolve, reject) => {
    pending.set(id, { reject, resolve });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

function nextEvent(method, timeout = 10_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
    const listener = (value) => {
      clearTimeout(timer);
      resolve(value);
    };
    const waiters = eventWaiters.get(method) ?? [];
    waiters.push(listener);
    eventWaiters.set(method, waiters);
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    awaitPromise: true,
    expression,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Browser evaluation failed.");
  }
  return result.result.value;
}

async function navigate(url) {
  const loaded = nextEvent("Page.loadEventFired");
  await command("Page.navigate", { url });
  await loaded;
  await delay(260);
}

const auditExpression = String.raw`(() => {
  const root = document.documentElement;
  const elements = [...document.querySelectorAll('body *')];
  const isVisible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
  };
  const label = (element) => ({
    tag: element.tagName.toLowerCase(),
    className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
    text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 120),
  });
  const visible = elements.filter(isVisible);
  const viewportOverflow = visible
    .filter((element) => !element.closest('svg,[aria-hidden="true"]'))
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (style.position === 'fixed') return false;
      return rect.left < -1 || rect.right > innerWidth + 1;
    })
    .slice(0, 24)
    .map((element) => ({ ...label(element), left: Math.round(element.getBoundingClientRect().left), right: Math.round(element.getBoundingClientRect().right) }));

  const clippedText = visible
    .filter((element) => (element.textContent ?? '').trim())
    .filter((element) => !element.querySelector('*'))
    .filter((element) => {
      const style = getComputedStyle(element);
      const clipsX = !['visible', 'clip'].includes(style.overflowX);
      const clipsY = !['visible', 'clip'].includes(style.overflowY);
      return (clipsX && element.scrollWidth > element.clientWidth + 2) || (clipsY && element.scrollHeight > element.clientHeight + 2);
    })
    .slice(0, 24)
    .map(label);

  const siblingOverlaps = [];
  for (const parent of visible) {
    const children = [...parent.children]
      .filter(isVisible)
      .filter((child) => (child.textContent ?? '').trim())
      .filter((child) => !['absolute', 'fixed'].includes(getComputedStyle(child).position));
    for (let leftIndex = 0; leftIndex < children.length; leftIndex += 1) {
      const left = children[leftIndex].getBoundingClientRect();
      for (let rightIndex = leftIndex + 1; rightIndex < children.length; rightIndex += 1) {
        const right = children[rightIndex].getBoundingClientRect();
        const overlapX = Math.min(left.right, right.right) - Math.max(left.left, right.left);
        const overlapY = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
        if (overlapX > 3 && overlapY > 3) {
          siblingOverlaps.push({ first: label(children[leftIndex]), second: label(children[rightIndex]) });
          if (siblingOverlaps.length >= 16) break;
        }
      }
      if (siblingOverlaps.length >= 16) break;
    }
    if (siblingOverlaps.length >= 16) break;
  }

  const landmarks = [...document.querySelectorAll('h1,h2,h3')].filter(isVisible).map((heading) => {
    const rect = heading.getBoundingClientRect();
    return { ...label(heading), top: Math.round(rect.top + scrollY), width: Math.round(rect.width), height: Math.round(rect.height) };
  });

  return {
    title: document.title,
    theme: root.dataset.theme,
    viewport: { height: innerHeight, width: innerWidth },
    document: { clientWidth: root.clientWidth, scrollHeight: root.scrollHeight, scrollWidth: root.scrollWidth },
    horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
    viewportOverflow,
    clippedText,
    siblingOverlaps,
    landmarks,
    oneMain: document.querySelectorAll('main').length === 1,
    oneH1: document.querySelectorAll('h1').length === 1,
    newsreaderLoaded: document.fonts.check('16px Newsreader'),
    brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
  };
})()`;

function slugForRoute(route) {
  if (route === "/") return "home";
  if (route === "/404.html") return "404";
  return route.replace(/^\//, "").replace(/\/$/, "").replaceAll("/", "-");
}

function shouldCapture(route, viewport, theme) {
  if (route === "/") return true;
  return (
    (viewport.key === "phone" && theme === "dark") ||
    (viewport.key === "desktop" && theme === "light")
  );
}

await command("Page.enable");
await command("Runtime.enable");

const report = [];
for (const theme of themes) {
  for (const viewport of viewports) {
    await command("Emulation.setDeviceMetricsOverride", {
      deviceScaleFactor: 1,
      height: viewport.height,
      mobile: viewport.width < 800,
      screenHeight: viewport.height,
      screenWidth: viewport.width,
      width: viewport.width,
    });
    await command("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-color-scheme", value: theme },
        { name: "prefers-reduced-motion", value: "no-preference" },
      ],
    });

    for (const route of routes) {
      await navigate(`${baseUrl}${route}`);
      const result = await evaluate(auditExpression);
      report.push({ route, theme, viewportKey: viewport.key, ...result });

      if (shouldCapture(route, viewport, theme)) {
        const screenshot = await command("Page.captureScreenshot", {
          format: "png",
          fromSurface: true,
        });
        const filename = `${slugForRoute(route)}-${viewport.key}-${theme}.png`;
        await writeFile(join(outputDir, filename), Buffer.from(screenshot.data, "base64"));
      }
    }
  }
}

await writeFile(
  join(outputDir, "report.json"),
  JSON.stringify(
    {
      baseUrl,
      failures: report.filter(
        (entry) =>
          entry.horizontalOverflow ||
          entry.brokenImages.length > 0 ||
          !entry.oneH1 ||
          !entry.oneMain ||
          !entry.newsreaderLoaded,
      ),
      report,
    },
    null,
    2,
  ),
);

chrome.kill();
socket.close();

const summary = {
  checks: report.length,
  failures: report.filter(
    (entry) =>
      entry.horizontalOverflow ||
      entry.brokenImages.length > 0 ||
      !entry.oneH1 ||
      !entry.oneMain ||
      !entry.newsreaderLoaded,
  ).length,
  output: outputDir,
  screenshots: report.filter((entry) =>
    shouldCapture(
      entry.route,
      viewports.find((viewport) => viewport.key === entry.viewportKey),
      entry.theme,
    ),
  ).length,
};

console.log(JSON.stringify(summary, null, 2));
