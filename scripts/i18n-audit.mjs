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
import { execSync } from "node:child_process";
import { parseTree } from "jsonc-parser";

const ROOT = path.resolve(process.cwd());
const SRC_DIR = path.join(ROOT, "src");
const I18N_DIR = path.join(SRC_DIR, "i18n");

const args = new Set(process.argv.slice(2));
const FIX = args.has("--fix");
const RESTORE_FROM =
  [...args].find((a) => a.startsWith("--restore-from="))?.split("=", 2)[1] ??
  null;

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

function setKeyPath(obj, keyPath, value) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== "object" || Array.isArray(cur[p])) {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
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
  const usedDirect = new Set();
  const usedPrefixes = new Set();
  const heuristicCandidates = new Set();
  const directRoots = new Set();

  // String literal calls: t("a.b.c") / t('a.b.c')
  const re = /\bt\s*\(\s*(['"])([^'"]+)\1\s*(?:,|\))/g;
  // Template literal calls with at least one interpolation: t(`a.b.${x}.c`)
  const reTpl = /\bt\s*\(\s*`([^`]*\$\{[^}]+\}[^`]*)`\s*(?:,|\))/g;
  // Simple concatenation prefix: t("a.b." + something)
  const reConcatPrefix = /\bt\s*\(\s*(['"])([^'"]+)\1\s*\+\s*[^)]+?\)/g;
  // Heuristic: any string literal that "looks like" a translation key (e.g. "jobstatus.overview.title")
  // This catches keys stored in maps/constants and later passed to `t()` indirectly.
  const reLooksLikeKey = /(['"])([a-z][a-z0-9_]*(?:\.[A-Za-z0-9_-]+)+)\1/g;

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    let m;
    while ((m = re.exec(text))) {
      const key = m[2];
      usedDirect.add(key);
      directRoots.add(key.split(".", 1)[0]);
    }

    // For template literals, we conservatively treat the leading static portion as a "prefix"
    // and keep all translation keys under that prefix (prevents deleting dynamically-addressed keys).
    while ((m = reTpl.exec(text))) {
      const tpl = m[1];
      const prefix = tpl.split("${", 1)[0];
      if (prefix && prefix.trim().length > 0) {
        usedPrefixes.add(prefix);
        directRoots.add(prefix.split(".", 1)[0]);
      }
    }

    while ((m = reConcatPrefix.exec(text))) {
      const prefix = m[2];
      if (prefix && prefix.trim().length > 0) {
        usedPrefixes.add(prefix);
        directRoots.add(prefix.split(".", 1)[0]);
      }
    }

    while ((m = reLooksLikeKey.exec(text))) {
      // Avoid capturing obvious non-i18n patterns by requiring at least one dot
      // and a conservative charset (no spaces).
      heuristicCandidates.add(m[2]);
    }
  }

  return { usedDirect, usedPrefixes, heuristicCandidates, directRoots };
}

function readJsonFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  return { raw, data: JSON.parse(raw) };
}

function readJsonFromGit(ref, relPath) {
  const cmd = `git show ${ref}:${relPath}`;
  const raw = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
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
  const baseRoots = Object.keys(locales[baseLocale].data ?? {});

  const { usedDirect, usedPrefixes, heuristicCandidates, directRoots } =
    extractUsedKeysFromSource(SRC_DIR);

  // Allowed roots protect the heuristic from matching non-i18n strings.
  // It is derived from the base locale file plus any roots we see in direct `t(...)` usage
  // (so new namespaces are still detected without needing to update the script).
  const allowedRoots = new Set([...baseRoots, ...directRoots]);

  const usedKeys = new Set(usedDirect);
  for (const key of heuristicCandidates) {
    const root = key.split(".", 1)[0];
    if (allowedRoots.has(root)) usedKeys.add(key);
  }

  const isUsed = (key) => {
    if (usedKeys.has(key)) return true;
    for (const p of usedPrefixes) {
      if (key.startsWith(p)) return true;
    }
    return false;
  };

  const missingInBase = new Set([...usedKeys].filter((k) => !baseFlat.has(k)));
  const unusedInBase = new Set([...baseFlat.keys()].filter((k) => !isUsed(k)));

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

  if (RESTORE_FROM) {
    // Restore keys from a git ref that appear to be used (including dynamic prefixes),
    // but are missing from the current translation files.
    let restoredTotal = 0;
    for (const [locale, info] of Object.entries(locales)) {
      const rel = path.relative(ROOT, info.file).replaceAll(path.sep, "/");
      let fromGit;
      try {
        fromGit = readJsonFromGit(RESTORE_FROM, rel);
      } catch (e) {
        console.error(`\n--restore-from failed for ${rel}. Is ref valid? (${RESTORE_FROM})`);
        process.exitCode = 2;
        return;
      }

      const currentFlat = info.flat;
      const oldFlat = flatten(fromGit.data);
      for (const [k, v] of oldFlat.entries()) {
        if (!currentFlat.has(k) && isUsed(k)) {
          setKeyPath(info.data, k, v);
          restoredTotal++;
        }
      }
      // Refresh flat maps for subsequent reporting
      info.flat = flatten(info.data);
    }

    if (restoredTotal > 0) {
      for (const [, info] of Object.entries(locales)) {
        fs.writeFileSync(info.file, JSON.stringify(info.data, null, 2) + "\n", "utf8");
      }
      console.error(`\n--restore-from applied: restored ${restoredTotal} used keys from ${RESTORE_FROM}.`);
    } else {
      console.error(`\n--restore-from: no missing used keys found to restore from ${RESTORE_FROM}.`);
    }
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

