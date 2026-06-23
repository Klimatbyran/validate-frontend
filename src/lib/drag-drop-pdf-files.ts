/** True when the file looks like a PDF (type or extension). */
export function isPdfFile(file: File): boolean {
  if (file.type === "application/pdf") return true;
  return file.name.toLowerCase().endsWith(".pdf");
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function dedupeFiles(files: File[]): File[] {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = fileKey(file);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function collectFilesFromEntry(
  entry: FileSystemEntry,
  accept: (file: File) => boolean,
): Promise<File[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    return accept(file) ? [file] : [];
  }

  if (!entry.isDirectory) return [];

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const collected: File[] = [];

  const readBatch = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });

  let batch: FileSystemEntry[];
  do {
    batch = await readBatch();
    for (const child of batch) {
      collected.push(...(await collectFilesFromEntry(child, accept)));
    }
  } while (batch.length > 0);

  return collected;
}

/** Collect PDF files from a drag event, including nested folder contents. */
export async function collectPdfFilesFromDataTransfer(
  dataTransfer: DataTransfer,
): Promise<File[]> {
  // Snapshot synchronously — after any await, browsers may clear dataTransfer.files
  // (common when dropping multiple loose PDFs at once).
  const fromFilesList = dedupeFiles(
    Array.from(dataTransfer.files ?? []).filter(isPdfFile),
  );

  const fromEntries: File[] = [];
  const items = Array.from(dataTransfer.items ?? []);

  for (const item of items) {
    if (item.kind !== "file") continue;
    const entry = item.webkitGetAsEntry?.() ?? null;
    if (entry) {
      fromEntries.push(...(await collectFilesFromEntry(entry, isPdfFile)));
    }
  }

  return dedupeFiles([...fromEntries, ...fromFilesList]);
}
