export async function copyTextToClipboard(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof window !== 'undefined') {
    window.prompt('Copy this text manually:', text);
  }
}
