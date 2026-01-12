/**
 * String Utility Functions
 */

/**
 * წაშლის HTML ტეგებს ტექსტიდან
 * @param html - HTML შემცველი ტექსტი
 * @returns გასუფთავებული ტექსტი HTML ტეგების გარეშე
 */
export function stripHtmlTags(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}
