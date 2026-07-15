// Escape user-controlled values before interpolating them into email HTML.
// Display names, story titles, and referral text are user input — without
// escaping, a display name like "<a href=https://evil.example>Support</a>"
// becomes live markup in the recipient's inbox (a phishing vector, especially
// for the admin notification emails).
export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
