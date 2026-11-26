import { toast } from "sonner";

/** Copies Markdown to the clipboard -- for pasting into a chat with an AI
 * or a colleague. Falls back to downloading it as `fileName` when the
 * clipboard is blocked (e.g. no permission). */
export async function copyMarkdown(
  text: string,
  fileName: string,
  what = "Report",
) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied as Markdown`);
  } catch {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/markdown" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      `Clipboard unavailable, so the ${what.toLowerCase()} was downloaded`,
    );
  }
}
