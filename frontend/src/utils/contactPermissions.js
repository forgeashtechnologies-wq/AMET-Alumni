// Simple helper for checking if contact details are actually visible.
// This should be used together with useProfileContact results.
export function canViewContact(contactResult) {
  if (!contactResult) return false;
  if (contactResult.email || contactResult.phone_number) return true;
  return false;
}
