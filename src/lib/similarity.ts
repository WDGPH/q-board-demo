import type { Question } from "../types";

const ignoredWords = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "can",
  "could",
  "does",
  "for",
  "from",
  "how",
  "into",
  "its",
  "our",
  "should",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "this",
  "those",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
]);

function contentWords(text: string) {
  return new Set(
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((word) => word.length > 2 && !ignoredWords.has(word)) ?? [],
  );
}

export function findSimilarQuestions(
  question: Question,
  candidates: Question[],
): Question[] {
  const words = contentWords(question.question_text);
  if (words.size < 3) return [];

  return candidates
    .filter((candidate) => candidate.id !== question.id && candidate.status !== "hidden")
    .map((candidate) => {
      const candidateWords = contentWords(candidate.question_text);
      const sharedWords = [...words].filter((word) => candidateWords.has(word));
      const unionSize = new Set([...words, ...candidateWords]).size;
      return {
        candidate,
        score: unionSize ? sharedWords.length / unionSize : 0,
        sharedWordCount: sharedWords.length,
      };
    })
    .filter(({ score, sharedWordCount }) => score >= 0.45 && sharedWordCount >= 3)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.candidate.vote_count - a.candidate.vote_count ||
        a.candidate.id.localeCompare(b.candidate.id),
    )
    .slice(0, 3)
    .map(({ candidate }) => candidate);
}
