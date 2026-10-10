import crypto from "crypto";

/**
 * Temporary passwords are read aloud over the phone and re-typed from an SMS,
 * so the alphabet drops the characters that get confused in that round trip:
 * O/0, I/1/l, and anything that needs a shift key on a feature phone.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";

const DEFAULT_LENGTH = 12;

/**
 * Fallback password applied when an admin creates a teacher without typing one.
 * It is shared and guessable by design so office staff can hand it out, which
 * means teachers must be told to change it at first login.
 */
export const DEFAULT_TEACHER_PASSWORD = "teacher123";

/**
 * Same arrangement as {@link DEFAULT_TEACHER_PASSWORD}, for parents created by
 * an admin without a password typed in.
 */
export const DEFAULT_PARENT_PASSWORD = "parent123";

/**
 * Generates a random temporary password using a CSPRNG.
 *
 * Rejection sampling keeps the distribution uniform — taking `randomBytes`
 * modulo the alphabet length would bias the first few characters, which is
 * exactly the sort of shortcut that turns a 12-character password into a much
 * smaller search space.
 */
export function generateTemporaryPassword(length = DEFAULT_LENGTH): string {
  const max = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  let result = "";

  while (result.length < length) {
    for (const byte of crypto.randomBytes(length)) {
      if (byte >= max) {
        continue;
      }

      result += ALPHABET[byte % ALPHABET.length];

      if (result.length === length) {
        break;
      }
    }
  }

  return result;
}
