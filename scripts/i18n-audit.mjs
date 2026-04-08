#!/usr/bin/env node
/**
 * i18n audit + optional cleanup:
 * - Detect duplicate keys in JSON (including ones JSON.parse would overwrite)
 * - Report missing keys (used in code but not present in translations)
 * - Report unused keys (present in translations but never referenced via t("..."))
 * - Optional --fix to remove unused keys from translation files
 *
 * Usage:
 *   node scripts/i18n-audit.mjs
 *   node scripts/i18n-audit.mjs --fix
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseTree } from "jsonc-parser";

const ROOT = path.resolve(process.cwd());
const SRC_DIR = path.join(ROOT, "src");
const I18N_DIR = path.join(SRC_DIR, "i18n");

const args = new Set(process.argv.slice(2));
const FIX = args.has("--fix");

function listFilesRecursive(dir, exts) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist" || ent.name.startsWith(".")) {
        continue;
      }
      out.push(...listFilesRecursive(full, exts));
    } else if (ent.isFile()) {
      if (!exts || exts.some((e) => ent.name.endsWith(e))) out.push(full);
    }
  }
  return out;
}

function flatten(obj, prefix = "") {
  const out = new Map();
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(next, v);
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [kk, vv] of flatten(v, next)) out.set(kk, vv);
    }
  }
  return out;
}

function removeKeyPath(obj, keyPath) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur || typeof cur !== "object") return;
    cur = cur[p];
  }
  if (cur && typeof cur === "object") delete cur[parts[parts.length - 1]];
}

function pruneEmptyObjects(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      pruneEmptyObjects(v);
      if (Object.keys(v).length === 0) delete obj[k];
    }
  }
  return obj;
}

function detectDuplicateKeys(jsonText, filename) {
  const tree = parseTree(jsonText);
  if (!tree) return [];

  /** @type {Array<{file:string,path:string,key:string}>} */
  const dups = [];

  function walk(node, pfx) {
    if (!node) return;
    if (node.type === "object") {
      /** @type {Map<string, number>} */
      const seen = new Map();
      // object children are "property" nodes
      for (const prop of node.children ?? []) {
        if (!prop || prop.type !== "property") continue;
        const keyNode = prop.children?.[0];
        const key = keyNode?.value;
        if (typeof key !== "string") continue;
        const nextPath = pfx ? `${pfx}.${key}` : key;
        const prev = seen.get(key) ?? 0;
        seen.set(key, prev + 1);
        if (prev >= 1) dups.push({ file: filename, path: pfx || "<root>", key });
        const valueNode = prop.children?.[1];
        walk(valueNode, nextPath);
      }
      return;
    }
    if (node.type === "array") {
      for (const child of node.children ?? []) walk(child, pfx);
    }
  }

  walk(tree, "");
  return dups;
}

function extractUsedKeysFromSource(srcRoot) {
  const files = listFilesRecursive(srcRoot, [".ts", ".tsx", ".js", ".jsx"]);
  const used = new Set();

  // String literal calls: t("a.b.c") / t('a.b.c')
  const re = /\bt\s*\(\s*(['"])([^'"]+)\1\s*(?:,|\))/g;

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    let m;
    while ((m = re.exec(text))) {
      used.add(m[2]);
    }
  }
  return used;
}

function readJsonFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  return { raw, data: JSON.parse(raw) };
}

function formatList(items, max = 40) {
  const arr = [...items].sort();
  const shown = arr.slice(0, max);
  const more = arr.length > max ? `\n  …and ${arr.length - max} more` : "";
  return shown.map((x) => `  - ${x}`).join("\n") + more;
}

function main() {
  const localeFiles = listFilesRecursive(I18N_DIR, [".json"]).sort();
  if (localeFiles.length === 0) {
    console.error(`No translation files found under ${I18N_DIR}`);
    process.exitCode = 2;
    return;
  }

  const usedKeys = extractUsedKeysFromSource(SRC_DIR);

  /** @type {Record<string, {file:string, raw:string, data:any, flat:Map<string,string>}>} */
  const locales = {};
  /** @type {Array<{file:string,path:string,key:string}>} */
  const duplicates = [];

  for (const file of localeFiles) {
    const locale = path.basename(file, ".json");
    const { raw, data } = readJsonFile(file);
    locales[locale] = { file, raw, data, flat: flatten(data) };
    duplicates.push(...detectDuplicateKeys(raw, file));
  }

  const baseLocale = locales.en ? "en" : Object.keys(locales)[0];
  const baseFlat = locales[baseLocale].flat;

  const missingInBase = new Set([...usedKeys].filter((k) => !baseFlat.has(k)));
  const unusedInBase = new Set([...baseFlat.keys()].filter((k) => !usedKeys.has(k)));

  /** @type {Record<string, Set<string>>} */
  const missingByLocale = {};
  for (const [locale, info] of Object.entries(locales)) {
    if (locale === baseLocale) continue;
    const missing = new Set([...baseFlat.keys()].filter((k) => !info.flat.has(k)));
    missingByLocale[locale] = missing;
  }

  let hasIssues = false;
  if (duplicates.length) {
    hasIssues = true;
    console.error(`\nDuplicate JSON keys (these can override each other silently):`);
    for (const d of duplicates) {
      console.error(`  - ${d.file}: duplicate "${d.key}" under ${d.path}`);
    }
  }

  if (missingInBase.size) {
    hasIssues = true;
    console.error(`\nMissing keys in base locale (${baseLocale}) that are used in code:`);
    console.error(formatList(missingInBase));
  }

  for (const [locale, missing] of Object.entries(missingByLocale)) {
    if (!missing.size) continue;
    hasIssues = true;
    console.error(`\nMissing keys in ${locale}.json (present in ${baseLocale}.json):`);
    console.error(formatList(missing));
  }

  if (unusedInBase.size) {
    console.error(`\nUnused keys in base locale (${baseLocale}) (present in translations but not referenced via t("...")):`);
    console.error(formatList(unusedInBase));
  }

  if (FIX) {
    // Only remove unused keys from all locales, based on base locale’s unused list.
    for (const [locale, info] of Object.entries(locales)) {
      for (const k of unusedInBase) removeKeyPath(info.data, k);
      pruneEmptyObjects(info.data);
      fs.writeFileSync(info.file, JSON.stringify(info.data, null, 2) + "\n", "utf8");
    }
    console.error(`\n--fix applied: removed ${unusedInBase.size} unused keys from all locales.`);
  }

  if (hasIssues) process.exitCode = 1;
}

main();

