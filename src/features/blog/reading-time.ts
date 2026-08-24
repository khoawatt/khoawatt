/**
 * Deterministic reading time (blog design spec §5).
 *
 * The algorithm is a contract — implementation and tests must agree exactly:
 *
 *   1. strip properly-terminated fenced code blocks (``` and ~~~ fences) from
 *      the source; each removed block contributes a fixed 60 "words". An
 *      unterminated opening fence degrades to prose and is never counted as a
 *      code block;
 *   2. in the remaining prose, count words as maximal whitespace-separated runs
 *      after removing Markdown punctuation markers (`#`, `*`, `_`, `>`, `-`,
 *      and table pipes `|`);
 *   3. total = (proseWords + 60 × codeBlocks) / 200, rounded up, minimum 1.
 *
 * Whitespace-splitting handles Vietnamese correctly (spaces delimit syllable
 * groups). Reading time is always computed at render from `content_md` and is
 * never stored.
 */

const PUNCTUATION_MARKERS = /[#*_>\-|]/g;

function countProseWords(trimmed: string): number {
  const cleaned = trimmed.replace(PUNCTUATION_MARKERS, " ").trim();
  if (cleaned === "") return 0;
  return cleaned.split(/\s+/).length;
}

/**
 * Compute the reading time in minutes from the raw Markdown source. Never
 * throws on malformed input; an unterminated fence degrades to prose.
 */
export function readingTimeMinutes(markdown: string): number {
  const lines = markdown.split(/\r?\n/);

  let proseWords = 0;
  let codeBlocks = 0;
  let inFence = false;
  let fenceChar = "";
  let fenceLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const fenceMatch = /^(`{3,}|~{3,})/.exec(trimmed);

    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceChar = fenceMatch[1][0];
        fenceLines = [];
      } else if (fenceMatch[1][0] === fenceChar) {
        inFence = false;
        codeBlocks += 1;
        fenceLines = [];
      } else {
        fenceLines.push(trimmed);
      }
      continue;
    }

    if (inFence) {
      fenceLines.push(trimmed);
      continue;
    }

    proseWords += countProseWords(trimmed);
  }

  // EOF with an open fence: not a valid code block — degrade its content to prose.
  for (const line of fenceLines) {
    proseWords += countProseWords(line);
  }

  const totalWords = proseWords + 60 * codeBlocks;
  return Math.max(1, Math.ceil(totalWords / 200));
}