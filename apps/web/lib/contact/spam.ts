/**
 * Spam scoring for the contact form — without asking the sender to do
 * anything. No captcha, no extra step, no third-party service, no cost.
 *
 * Every signal is weak on its own, so it takes two (a score of 3) to flag an
 * enquiry: a real person who pastes two links, or writes without JavaScript,
 * is never flagged for that alone. And a flag never deletes — the enquiry is
 * stored with the reason, kept out of the inbox and the email, and one click
 * from being restored in /admin/enquiries?show=spam.
 *
 * Deliberately *not* a signal: the word "SEO". Softmato sells SEO, so a real
 * brief may well ask for it. The phrases below are the pitch, not the topic.
 */

export interface SpamInput {
  name: string;
  message: string;
  /** Milliseconds from the form mounting to it being sent; null without JS. */
  elapsedMs: number | null;
}

const THRESHOLD = 3;

const LINK = /https?:\/\/|www\./gi;
const LINK_IN_NAME = /https?:\/\/|www\.|\.(com|net|org|ru|xyz)\b/i;
const PITCH =
  /\b(backlinks?|guest posts?|dofollow|casino|viagra|cialis|forex|bitcoin|crypto(currency)? invest\w*|escort|payday loans?|first page of google|rank (your|ur) (website|site)|increase (your )?(website )?traffic|unsubscribe)\b/i;
// Cyrillic, CJK, kana and Hangul. Devanagari is not here: Nepali is expected.
const FOREIGN = /[Ѐ-ӿ぀-ヿ一-鿿가-힯]/g;

/** The reason an enquiry looks like spam, or null if it does not. */
export function spamReason({
  name,
  message,
  elapsedMs,
}: SpamInput): string | null {
  let score = 0;
  const reasons: string[] = [];
  const flag = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  if (elapsedMs === null) {
    flag(1, 'sent without JavaScript');
  } else if (elapsedMs < 3000) {
    flag(2, `sent ${(elapsedMs / 1000).toFixed(1)}s after the page opened`);
  }

  const links = message.match(LINK)?.length ?? 0;
  if (links >= 4) flag(2, `${links} links`);
  else if (links > 0) flag(1, links === 1 ? 'a link' : `${links} links`);

  if (LINK_IN_NAME.test(name)) flag(3, 'a link in the name');

  const pitch = message.match(PITCH);
  if (pitch) flag(2, `"${pitch[0]}"`);

  const letters = message.match(/\p{L}/gu)?.length ?? 0;
  const foreign = message.match(FOREIGN)?.length ?? 0;
  if (letters > 0 && foreign / letters > 0.3) {
    flag(2, 'mostly Cyrillic or East Asian script');
  }

  return score >= THRESHOLD ? reasons.join('; ') : null;
}
