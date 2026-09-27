/**
 * Server-only extended common-password blocklist. Never import this from
 * a "use client" file -- it exists specifically so this larger list does
 * NOT ship in the browser bundle (the client gets password.ts's small
 * ~100-entry sample instead, enough for instant feedback; the server is
 * the real gate).
 *
 * Built the way real password-strength checkers do it: a base list of
 * ~120 genuinely common real-world passwords/words (public knowledge, not
 * a secret), expanded with the same mutations real attackers and real
 * users both actually use -- a trailing 00-99 or a trailing common year --
 * producing well over 1,000 distinct blocked entries from a maintainable
 * source list instead of 1,000 hand-typed literal lines.
 */

const BASE_WORDS = [
  "password", "123456", "123456789", "12345678", "12345", "1234567",
  "qwerty", "qwerty123", "abc123", "welcome", "letmein", "monkey",
  "dragon", "master", "iloveyou", "admin", "administrator", "login",
  "starwars", "sunshine", "princess", "football", "baseball", "superman",
  "batman", "trustno1", "whatever", "freedom", "shadow", "michael",
  "jennifer", "jordan", "hunter", "121212", "123123", "654321", "111111",
  "000000", "1q2w3e4r", "1qaz2wsx", "qazwsx", "zxcvbnm", "asdfgh",
  "asdfghjkl", "changeme", "passw0rd", "flower", "summer", "winter",
  "spring", "autumn", "computer", "internet", "coffee", "chocolate",
  "mustang", "cheese", "soccer", "hockey", "tennis", "basketball",
  "myspace", "facebook", "instagram", "twitter", "google", "microsoft",
  "apple", "amazon", "netflix", "spotify", "vela", "velaos", "doha",
  "qatar", "dubai", "abudhabi", "riyadh", "test", "testtest", "temppass",
  "guest", "letme", "abcd", "aaaaaaaa", "11111111", "asdf", "zxcv",
  "qwer", "poiu", "lkjh", "mnbv", "wasd", "121314", "123321", "112233",
  "1122334455", "password12", "passw0rd1", "welcome2020", "welcome2021",
  "iloveyou2", "sunshine1", "princess1", "football1", "baseball1",
  "michael1", "jennifer1", "hunter2", "matthew", "jessica", "ashley",
  "daniel", "andrew", "joshua", "nicole", "anthony", "william", "tigger",
  "yankees", "steelers", "cowboys", "lakers", "eagles", "master1",
  "shadow1", "dragon1", "monkey1", "letmein1", "trustno", "secret",
  "secret123", "default", "changeit", "newpass", "temp123", "hello",
  "hello123", "login123", "guest123", "user1234", "root1234", "oracle",
  "sqladmin", "postgres", "mysql123", "banana", "orange", "purple",
  "yellow", "redred", "bluesky", "greenday", "blackcat", "whitehat",
] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function buildExtendedList(): string[] {
  const set = new Set<string>();
  const years = ["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];
  for (const w of BASE_WORDS) {
    set.add(w);
    for (let n = 0; n <= 99; n++) {
      set.add(`${w}${n}`);
      set.add(`${w}${pad2(n)}`);
    }
    for (const y of years) set.add(`${w}${y}`);
    set.add(`${w}!`);
    set.add(`${w}1!`);
  }
  return Array.from(set);
}

/** Well over 1,000 distinct normalized common passwords. Lazily built once per server process. */
let cached: string[] | null = null;
export function getExtendedCommonPasswordList(): string[] {
  if (!cached) cached = buildExtendedList();
  return cached;
}
