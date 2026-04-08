import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function sh(args, opts = {}) {
  const out = execFileSync(args[0], args.slice(1), {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  });
  return (out ?? '').trim();
}

function shOk(args) {
  try {
    execFileSync(args[0], args.slice(1), {
      cwd: ROOT,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function getBaseRef() {
  // Prefer origin/main if present; fall back to main; then current HEAD~1 as last resort.
  if (shOk(['git', 'show-ref', '--verify', '--quiet', 'refs/remotes/origin/main'])) return 'origin/main';

  if (shOk(['git', 'show-ref', '--verify', '--quiet', 'refs/heads/main'])) return 'main';

  return 'HEAD~1';
}

function changedFiles(baseRef) {
  const out = sh(['git', 'diff', '--name-only', `${baseRef}...HEAD`]);
  if (!out) return [];
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function anyMatch(files, patterns) {
  return files.some((f) => patterns.some((p) => (p instanceof RegExp ? p.test(f) : f.startsWith(p))));
}

function groupFiles(files) {
  const groups = {
    docs: [],
    routing: [],
    editorUi: [],
    workflows: [],
    other: [],
  };

  for (const f of files) {
    if (f.startsWith('docs/')) groups.docs.push(f);
    else if (f.includes('routes') || f.includes('react-router') || f.includes('ROUTING_URL_STATE')) groups.routing.push(f);
    else if (f.startsWith('src/') && (f.includes('/tabs/') || f.includes('/ui/') || f.endsWith('.tsx')))
      groups.editorUi.push(f);
    else if (f.startsWith('.github/')) groups.workflows.push(f);
    else groups.other.push(f);
  }

  return groups;
}

function renderAutoBlock({ baseRef, files }) {
  const docsTouched = anyMatch(files, ['docs/']) || files.includes('README.md');
  const routingTouched = anyMatch(files, [
    'src/lib/top-level-routes',
    'src/tabs/editor/lib/editor-routes',
    'docs/ROUTING_URL_STATE.md',
  ]) || anyMatch(files, [/routes?/i, /react-router/i]);

  const groups = groupFiles(files);

  const list = (arr) => (arr.length ? arr.map((f) => `  - \`${f}\``).join('\n') : '  - (none)');

  return [
    '### 🤖 Auto summary (generated)',
    '',
    `- **Base ref**: \`${baseRef}\``,
    `- **Files changed**: **${files.length}**`,
    `- **Docs touched**: **${docsTouched ? 'yes' : 'no'}**`,
    `- **Routing/URL state likely impacted**: **${routingTouched ? 'yes' : 'no'}**`,
    '',
    '<details>',
    '<summary>Changed files (grouped)</summary>',
    '',
    '- **Docs**:',
    list(groups.docs),
    '',
    '- **Routing**:',
    list(groups.routing),
    '',
    '- **Editor/UI**:',
    list(groups.editorUi),
    '',
    '- **GitHub/CI**:',
    list(groups.workflows),
    '',
    '- **Other**:',
    list(groups.other),
    '',
    '</details>',
    '',
    ...(routingTouched
      ? [
          '**Routing note**: If this changes deep-links/query params, update `docs/ROUTING_URL_STATE.md` (or mark N/A).',
          '',
        ]
      : []),
    ...(docsTouched ? [] : ['**Docs note**: If behavior changed for users, consider updating `README.md` and/or `docs/`.', '']),
  ].join('\n');
}

function replaceAutoBlock(body, newBlock) {
  const start = '<!-- AUTO-GENERATED:START -->';
  const end = '<!-- AUTO-GENERATED:END -->';

  const startIdx = body.indexOf(start);
  const endIdx = body.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    // If markers are missing, append a new block at the end.
    return `${body.trim()}\n\n${start}\n${newBlock}\n${end}\n`;
  }

  const before = body.slice(0, startIdx + start.length);
  const after = body.slice(endIdx);
  return `${before}\n${newBlock}\n${after}`;
}

function main() {
  const templatePath = path.join(ROOT, '.github', 'pull_request_template.md');
  const template = safeRead(templatePath);
  if (!template) {
    console.error(`Could not read template at ${templatePath}`);
    process.exit(1);
  }

  const baseRef = getBaseRef();
  const files = changedFiles(baseRef);
  const autoBlock = renderAutoBlock({ baseRef, files });

  const mode = process.argv[2] ?? 'render';
  if (mode === 'render') {
    process.stdout.write(replaceAutoBlock(template, autoBlock));
    return;
  }

  if (mode === 'refresh') {
    const bodyPath = process.argv[3];
    if (!bodyPath) {
      console.error('Usage: node scripts/gh/pr-body.mjs refresh <path-to-body.md>');
      process.exit(2);
    }
    const existing = safeRead(path.resolve(ROOT, bodyPath));
    if (!existing) {
      console.error(`Could not read body file: ${bodyPath}`);
      process.exit(3);
    }
    const updated = replaceAutoBlock(existing, autoBlock);
    fs.writeFileSync(path.resolve(ROOT, bodyPath), updated, 'utf8');
    return;
  }

  console.error(`Unknown mode: ${mode} (expected: render|refresh)`);
  process.exit(2);
}

main();
