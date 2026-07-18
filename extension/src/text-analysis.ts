import { cleanText } from "./feed-item";

export type TokenizeOptions = {
  minLength?: number;
  stopWords?: ReadonlySet<string>;
};

const WORD_PATTERN = /[\p{L}\p{N}]+/gu;
const CJK_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

export function tokenizeText(value: string, options: TokenizeOptions = {}) {
  const { minLength = 3, stopWords = new Set<string>() } = options;
  const rawTokens = cleanText(value).toLocaleLowerCase().match(WORD_PATTERN) ?? [];

  return rawTokens
    .flatMap(segmentToken)
    .filter((token) => isLongEnough(token, minLength) && !stopWords.has(token));
}

export function countPhraseHits(value: string, phrases: readonly string[]) {
  const tokens = tokenizeText(value, { minLength: 1 });

  return phrases.reduce((count, phrase) => {
    const phraseTokens = tokenizeText(phrase, { minLength: 1 });

    return count + (containsSequence(tokens, phraseTokens) ? 1 : 0);
  }, 0);
}

function segmentToken(token: string) {
  if (!CJK_PATTERN.test(token) || typeof Intl.Segmenter !== "function") {
    return [token];
  }

  const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

  return [...segmenter.segment(token)]
    .filter((segment) => segment.isWordLike)
    .map((segment) => segment.segment);
}

function isLongEnough(token: string, minLength: number) {
  return CJK_PATTERN.test(token) ? token.length >= 1 : token.length >= minLength;
}

function containsSequence(tokens: string[], phraseTokens: string[]) {
  if (phraseTokens.length === 0 || phraseTokens.length > tokens.length) {
    return false;
  }

  return tokens.some((_, startIndex) =>
    phraseTokens.every((token, offset) => tokens[startIndex + offset] === token),
  );
}
