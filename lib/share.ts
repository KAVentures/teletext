import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";
import type { TeletextEdition } from "./types";

export type ShareSnapshot = {
  v: 1;
  page: number;
  language: string;
  query?: string;
  edition: TeletextEdition;
};

export function encodeSnapshot(snapshot: ShareSnapshot) {
  const raw = Buffer.from(JSON.stringify(snapshot), "utf8");
  if (raw.byteLength > 60_000) throw new Error("Snapshot is too large");

  const compressed = brotliCompressSync(raw, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 6
    }
  });

  return compressed.toString("base64url");
}

export function decodeSnapshot(payload: string): ShareSnapshot {
  if (!payload || payload.length > 16_000) throw new Error("Invalid snapshot");

  const raw = brotliDecompressSync(Buffer.from(payload, "base64url"));
  if (raw.byteLength > 60_000) throw new Error("Snapshot is too large");

  const parsed = JSON.parse(raw.toString("utf8")) as ShareSnapshot;

  if (
    parsed?.v !== 1 ||
    !Number.isInteger(parsed.page) ||
    !parsed.edition ||
    !Array.isArray(parsed.edition.stories) ||
    typeof parsed.language !== "string"
  ) {
    throw new Error("Invalid snapshot");
  }

  return parsed;
}
