/** Slug format for tag options: lowercase letters, digits, hyphens only. Enforced by API. */
export const TAG_OPTION_SLUG_REGEX = /^[a-z0-9-]+$/;

/** Tag option from GET /api/tag-options (garbo). */
export interface TagOption {
  id: string;
  slug: string;
  label: string | null;
}

export interface CreateTagOptionBody {
  slug: string;
  label?: string | null;
}

export interface UpdateTagOptionBody {
  slug?: string;
  label?: string | null;
}
