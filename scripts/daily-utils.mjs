export const LANGUAGES = ["en", "sv", "de", "es", "fr"];

export function utcDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isCompleteEdition(edition, language) {
  return edition?.mode === "live" &&
    edition.language === language &&
    !Number.isNaN(Date.parse(edition.updatedAt)) &&
    Array.isArray(edition.stories) &&
    edition.stories.length >= 4 && edition.stories.length <= 6 &&
    edition.stories.every((story) =>
      typeof story.headline === "string" &&
      story.headline.trim().length > 0 &&
      Array.isArray(story.paragraphs) &&
      story.paragraphs.length >= 1 &&
      Array.isArray(story.sources) &&
      story.sources.some((s) => typeof s.url === "string" &&
        /^https:\/\/(?:www\.)?x\.com\/[^/]+\/status\/\d+/i.test(s.url))
    );
}

export function alreadyPublished(snapshot, date = utcDate()) {
  return snapshot?.date === date && LANGUAGES.every((lang) =>
    isCompleteEdition(snapshot?.editions?.[lang], lang)
  );
}
