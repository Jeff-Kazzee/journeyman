import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { internalPages } from "../site/lib/routes.ts";

const outputRoot = path.resolve(process.argv[2] ?? "site/out");

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? filesUnder(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
  return nested.flat();
}

function routeFor(file: string): string {
  const relative = path.relative(outputRoot, file).replaceAll(path.sep, "/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"index.html".length)}`;
  return `/${relative.replace(/\.html$/, "/")}`;
}

function attributes(markup: string, name: "href" | "src"): string[] {
  return [...markup.matchAll(new RegExp(`\\b${name}=["']([^"']+)["']`, "gi"))].map((match) => match[1]);
}

function sourceSetReferences(markup: string): string[] {
  return [...markup.matchAll(/\b(?:srcset|imagesrcset)=["']([^"']+)["']/gi)]
    .flatMap((match) => match[1].split(","))
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function stylesheetReferences(css: string): string[] {
  return [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function navRegions(markup: string): string[] {
  return [...markup.matchAll(/<nav\b[^>]*data-site-nav=["'](?:header|footer)["'][^>]*>[\s\S]*?<\/nav>/gi)].map((match) => match[0]);
}

function canonicalPath(value: string, currentRoute: string): string {
  const url = new URL(value, `https://journeyman.invalid${currentRoute}`);
  return url.pathname.endsWith("/") || path.posix.extname(url.pathname) ? url.pathname : `${url.pathname}/`;
}

async function resolvesInternalReference(value: string, currentRoute: string): Promise<boolean> {
  const url = new URL(value, `https://journeyman.invalid${currentRoute}`);
  if (url.origin !== "https://journeyman.invalid") return true;
  const pathname = decodeURIComponent(url.pathname);
  const relative = pathname.replace(/^\/+/, "");
  const candidates = path.posix.extname(pathname)
    ? [path.join(outputRoot, relative)]
    : pathname.endsWith("/")
      ? [path.join(outputRoot, relative, "index.html")]
      : [path.join(outputRoot, relative, "index.html"), path.join(outputRoot, `${relative}.html`)];
  for (const candidate of candidates) {
    try { await access(candidate); return true; } catch { /* Try the next static-export shape. */ }
  }
  return false;
}

async function main() {
  const files = await filesUnder(outputRoot);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  const pageFiles = htmlFiles.filter((file) => !["404.html", "404/index.html"].includes(path.relative(outputRoot, file).replaceAll(path.sep, "/")));
  const routes = pageFiles.map(routeFor).sort();
  const sitePages = internalPages.map((page) => page.href);
  const errors: string[] = [];
  let internalReferences = 0;

  for (const route of sitePages) if (!routes.includes(route)) errors.push(`Missing required exported page: ${route}`);
  for (const route of routes) if (!sitePages.includes(route as (typeof sitePages)[number])) errors.push(`Exported page is missing from the route manifest: ${route}`);

  for (const file of pageFiles) {
    const route = routeFor(file);
    const markup = await readFile(file, "utf8");
    const navs = navRegions(markup);
    if (navs.length !== 2) errors.push(`${route} has ${navs.length} global nav regions; expected header and footer.`);
    for (const [index, nav] of navs.entries()) {
      const label = index === 0 ? "header" : "footer";
      const links = attributes(nav, "href").filter((href) => href.startsWith("/")).map((href) => canonicalPath(href, route));
      const current = [...nav.matchAll(/data-nav-current=["']([^"']+)["']/gi)].map((match) => canonicalPath(match[1], route));
      if (links.includes(route)) errors.push(`${route} ${label} nav contains a self-link.`);
      if (!current.includes(route)) errors.push(`${route} ${label} nav lacks its non-clickable current-page marker.`);
      for (const target of sitePages) {
        if (target === route) continue;
        if (!links.includes(target)) errors.push(`${route} ${label} nav lacks link to ${target}.`);
      }
    }

    const ids = new Set([...markup.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]));
    for (const value of [...attributes(markup, "href"), ...attributes(markup, "src"), ...sourceSetReferences(markup)]) {
      if (/^(?:https?:|mailto:|tel:|data:|blob:)/i.test(value)) continue;
      internalReferences += 1;
      if (value.startsWith("#")) {
        const fragment = decodeURIComponent(value.slice(1));
        if (fragment && !ids.has(fragment)) errors.push(`${route} has broken fragment reference ${value}.`);
        continue;
      }
      if (!await resolvesInternalReference(value, route)) errors.push(`${route} has broken internal reference ${value}.`);
    }
  }

  for (const file of files.filter((candidate) => candidate.endsWith(".css"))) {
    const css = await readFile(file, "utf8");
    const stylesheetPath = `/${path.relative(outputRoot, file).replaceAll(path.sep, "/")}`;
    for (const value of stylesheetReferences(css)) {
      if (/^(?:https?:|data:|blob:)/i.test(value) || value.startsWith("#")) continue;
      internalReferences += 1;
      if (!await resolvesInternalReference(value, stylesheetPath)) errors.push(`${stylesheetPath} has broken internal asset reference ${value}.`);
    }
  }

  if (errors.length) throw new Error(`Static site link check failed:\n- ${[...new Set(errors)].join("\n- ")}`);
  console.log(`site:links passed — ${sitePages.length} pages, ${htmlFiles.length} HTML files, ${internalReferences} internal references, 2 nav regions per page.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
