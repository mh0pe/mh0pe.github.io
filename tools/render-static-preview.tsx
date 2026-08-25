import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../app/page";

const projectRoot = process.cwd();
const outputPath = resolve(
  process.argv[2] ?? resolve(projectRoot, "build/local-preview/index.html"),
);
const styles = readFileSync(
  resolve(projectRoot, "public/portfolio.css"),
  "utf8",
).trim();
const markup = renderToStaticMarkup(<Home />);
const document = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#091217">
    <title>Madison Steiner | Principal AI Architect</title>
    <style>${styles}</style>
  </head>
  <body>${markup}</body>
</html>
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, document, "utf8");
console.log(outputPath);
