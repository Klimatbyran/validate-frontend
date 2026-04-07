/** Path for single-company editor detail (see docs/ROUTING_URL_STATE.md). */
export function editorCompanyPath(companyId: string): string {
  return `/editor/company/${encodeURIComponent(companyId)}`;
}

export const EDITOR_INDEX_PATH = "/editor";
