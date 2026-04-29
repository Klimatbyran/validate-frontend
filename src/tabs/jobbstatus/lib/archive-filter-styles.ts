/**
 * Shared field styles for Jobbstatus Archive search + batch filters.
 * Keeps the archive toolbar visually aligned with other gray card inputs in the app.
 */

/** Archive toolbar: same card shell as other Jobbstatus filter areas; stacks on small screens. */
export const ARCHIVE_FILTER_CARD_CLASS =
  "bg-gray-04/50 rounded-lg p-4 border border-gray-03 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end";

export const ARCHIVE_TEXT_INPUT_CLASS =
  "w-full py-2 px-3 rounded-md border border-gray-03 bg-gray-05 text-gray-01 text-sm placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-blue-03/50 focus:border-blue-03";

export const ARCHIVE_TEXT_INPUT_COMPACT_CLASS =
  "flex-1 min-w-0 py-1.5 px-2 rounded-md border border-gray-03 bg-gray-05 text-gray-01 text-xs placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-blue-03/50 focus:border-blue-03";

export const ARCHIVE_SELECT_CLASS = `${ARCHIVE_TEXT_INPUT_CLASS} disabled:opacity-60`;
