const { v4 } = require("uuid");
const fs = require("fs");
const {
  createdDate,
  trashFile,
  writeToServerDocuments,
} = require("../../utils/files");
const { MimeDetector } = require("../../utils/files/mime");
const { tokenizeString } = require("../../utils/tokenizer");
const { default: slugify } = require("slugify");

const REMOTE_TRANSCRIPTION_ENDPOINT =
  process.env.AUDIO_TRANSCRIPTION_ENDPOINT ||
  "http://10.0.70.132:5000/transcribe";

function getMimeType(fullFilePath) {
  try {
    return (
      new MimeDetector().getType(fullFilePath) || "application/octet-stream"
    );
  } catch {
    return "application/octet-stream";
  }
}

async function transcribeWithRemoteService(fullFilePath, filename) {
  try {
    const audioBuffer = fs.readFileSync(fullFilePath);
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([audioBuffer], { type: getMimeType(fullFilePath) }),
      filename
    );

    const response = await fetch(REMOTE_TRANSCRIPTION_ENDPOINT, {
      method: "POST",
      body: formData,
    });
    const responseBody = await response.text();

    if (!response.ok) {
      return {
        content: null,
        error:
          responseBody ||
          `Remote transcription service returned ${response.status} ${response.statusText}.`,
      };
    }

    let payload = null;
    try {
      payload = JSON.parse(responseBody);
    } catch {
      return {
        content: null,
        error: "Remote transcription service did not return valid JSON.",
      };
    }

    const content =
      typeof payload?.transcript === "string" ? payload.transcript.trim() : "";
    if (!content) {
      return {
        content: null,
        error: "Remote transcription service returned an empty transcript.",
      };
    }

    return { content, error: null };
  } catch (error) {
    return {
      content: null,
      error:
        error?.message ||
        "An unknown error occurred while calling the remote transcription service.",
    };
  }
}

async function asAudio({
  fullFilePath = "",
  filename = "",
  options = {},
  metadata = {},
}) {
  console.log(`-- Working ${filename} --`);
  console.log(
    `[Collector] Sending ${filename} to ${REMOTE_TRANSCRIPTION_ENDPOINT} for transcription.`
  );
  const { content, error } = await transcribeWithRemoteService(
    fullFilePath,
    filename
  );

  if (!!error) {
    console.error(`Error encountered for parsing of ${filename}.`);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: error,
      documents: [],
    };
  }

  if (!content?.length) {
    console.error(`Resulting text content was empty for ${filename}.`);
    if (!options.absolutePath) trashFile(fullFilePath);
    return {
      success: false,
      reason: `No text content found in ${filename}.`,
      documents: [],
    };
  }

  const transcriptFilename = `${filename}.txt`;
  const data = {
    id: v4(),
    url: "file://" + fullFilePath,
    title: metadata.title || transcriptFilename,
    docAuthor: metadata.docAuthor || "no author found",
    description: metadata.description || "No description found.",
    docSource:
      metadata.docSource ||
      "audio file uploaded by the user and transcribed remotely.",
    chunkSource: metadata.chunkSource || transcriptFilename,
    published: createdDate(fullFilePath),
    wordCount: content.split(" ").length,
    pageContent: content,
    token_count_estimate: tokenizeString(content),
  };

  const document = writeToServerDocuments({
    data,
    filename: `${slugify(transcriptFilename)}-${data.id}`,
    options: { parseOnly: options.parseOnly },
  });
  if (!options.absolutePath) trashFile(fullFilePath);
  console.log(
    `[SUCCESS]: ${filename} transcribed, converted & ready for embedding.\n`
  );
  return { success: true, reason: null, documents: [document] };
}

module.exports = asAudio;
