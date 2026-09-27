import { checkPasswordRules } from "../lib/auth/password";
import { getExtendedCommonPasswordList } from "../lib/auth/password-common-server";

const commonList = getExtendedCommonPasswordList();

type Case = { pw: string; email?: string; fullName?: string; expect: boolean; label: string };

const cases: Case[] = [
  { pw: "123456789", expect: false, label: "pure digits, too short on rules but also sequence" },
  { pw: "Password1!", expect: false, label: "common word + trivial suffix" },
  { pw: "Aa1!Aa1!Aa1!", expect: false, label: "repeating 4-char unit" },
  { pw: "aaaaaaaaaa", expect: false, label: "single repeated char" },
  { pw: "Qwertyuiop1!", expect: false, label: "keyboard row walk" },
  { pw: "Abcdefghij1!", expect: false, label: "alphabet sequence" },
  { pw: "AhmedHarrabi99!", expect: false, label: "contains full name fragment", fullName: "Ahmed Harrabi" },
  { pw: "Oussama2024!", expect: false, label: "contains email local part", email: "oussama@example.com" },
  { pw: "Short1!", expect: false, label: "too short (7 chars, min is 10)" },
  { pw: "Doha-Sunset42x", expect: true, label: "real passphrase-style password should pass" },
  { pw: "Tr0pical!Whisper9", expect: true, label: "another realistic strong password" },
  { pw: "a".repeat(80) + "A1!", expect: false, label: "exceeds 72 char max" },
  { pw: "", expect: false, label: "empty password" },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const result = checkPasswordRules(c.pw, { email: c.email, fullName: c.fullName, commonList });
  const ok = result.valid === c.expect;
  console.log(
    `${ok ? "PASS" : "FAIL"} [${c.label}] pw=${JSON.stringify(c.pw.length > 30 ? c.pw.slice(0, 30) + "..." : c.pw)} ` +
    `expected valid=${c.expect} got valid=${result.valid} firstError=${result.firstError} score=${result.score}`
  );
  if (ok) pass++; else fail++;
}

console.log(`\n${pass}/${cases.length} cases passed, ${fail} failed.`);
console.log(`Extended common list size: ${commonList.length} entries.`);
process.exit(fail > 0 ? 1 : 0);
