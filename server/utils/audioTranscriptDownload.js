const path = require("path");
const { sanitizeFileName } = require("./files");

const AUDIO_TRANSCRIPT_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".mp4",
  ".mpeg",
  ".ogg",
  ".oga",
  ".opus",
  ".m4a",
  ".webm",
  ".aac",
]);

function transcriptDownloadFor(originalname = "", doc = {}) {
  const extension = path.extname(originalname).toLowerCase();
  if (!AUDIO_TRANSCRIPT_EXTENSIONS.has(extension) || !doc?.pageContent) {
    return null;
  }

  const baseName =
    sanitizeFileName(path.parse(originalname).name) || "audio-transcript";
  return {
    filename: `${baseName}-transcript.txt`,
    content: doc.pageContent,
    mime: "text/plain;charset=utf-8",
  };
}

module.exports = {
  transcriptDownloadFor,
};
