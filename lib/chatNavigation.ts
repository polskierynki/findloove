const CHAT_TARGET_STORAGE_KEY = 'zl-chat-target-profile-id';

function normalizeProfileId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getChatTargetFromSearch(search: string): string | null {
  const params = new URLSearchParams(search || '');
  const rawTarget = normalizeProfileId(params.get('user'));
  if (!rawTarget) return null;

  try {
    return normalizeProfileId(decodeURIComponent(rawTarget));
  } catch {
    return rawTarget;
  }
}

export function persistPendingChatTarget(profileId: string): void {
  if (typeof window === 'undefined') return;

  const normalized = normalizeProfileId(profileId);
  if (!normalized) return;

  window.sessionStorage.setItem(CHAT_TARGET_STORAGE_KEY, normalized);
}

export function consumePendingChatTarget(): string | null {
  if (typeof window === 'undefined') return null;

  const rawTarget = window.sessionStorage.getItem(CHAT_TARGET_STORAGE_KEY);
  if (!rawTarget) return null;

  window.sessionStorage.removeItem(CHAT_TARGET_STORAGE_KEY);
  return normalizeProfileId(rawTarget);
}

export function navigateToUserChat(
  router: { push: (href: string) => void },
  profileId: string,
): void {
  const normalized = normalizeProfileId(profileId);
  if (!normalized) return;

  persistPendingChatTarget(normalized);
  router.push(`/messages?user=${encodeURIComponent(normalized)}`);
}
