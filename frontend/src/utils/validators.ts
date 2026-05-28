export const isNonEmpty = (v?: string) => !!v && v.trim().length > 0;
export const isValidUrl = (v?: string) => !!v && /^(https:\/\/|mailto:).+/.test(v.trim());

export const canPublishQuickLink = (draft: any) =>
  isNonEmpty(draft?.title)
  && isNonEmpty(draft?.job_type)
  && isNonEmpty(draft?.location)
  && isNonEmpty(draft?.description)
  && (
    isValidUrl(draft?.application_url)
    || (!!draft?.contact_email && /.+@.+\..+/.test(String(draft?.contact_email)))
  );
