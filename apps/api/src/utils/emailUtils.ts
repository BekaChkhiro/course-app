/**
 * Gmail მისამართებისთვის წერტილებს შლის შედარებისთვის.
 * Gmail-ში john.doe@gmail.com = johndoe@gmail.com
 */
export function normalizeEmailForLookup(email: string): string {
  const normalized = email.toLowerCase().trim();
  const [local, domain] = normalized.split('@');

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return local.replace(/\./g, '') + '@' + domain;
  }

  return normalized;
}

/**
 * მომხმარებლის მოძებნა email-ით (Gmail dot-insensitive)
 */
export async function findUserByEmail(email: string) {
  const { db } = await import('../config/database');

  const normalizedEmail = normalizeEmailForLookup(email);
  const originalEmail = email.toLowerCase().trim();

  // ჯერ პირდაპირ ვცდით, შემდეგ ნორმალიზებულით
  let user = await db.user.findUnique({
    where: { email: originalEmail },
  });

  if (!user && normalizedEmail !== originalEmail) {
    user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });
  }

  return user;
}
