export const LANGUAGES = ["en", "sv", "de", "es", "fr"];

export function utcDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isCompleteEdition(edition, language) {
  return edition?.mode === "live" &&
    edition.language === language &&
    typeof edition.updatedAt === "string" &&
    Array.isArray(edition.stories) &&
    edition.stories.length >= 4 &&
    edition.stories.every((story) =>
      typeof story.headline === "string" &&
      story.headline.length > 0 &&
      Array.isArray(story.paragraphs) &&
      story.paragraphs.length > 0
    );
}

export function alreadyPublished(snapshot, date = utcDate()) {
  return snapshot?.date === date && LANGUAGES.every((lang) =>
    isCompleteEdition(snapshot?.editions?.[lang], lang)
  );
}
