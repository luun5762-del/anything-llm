export function downloadTranscriptFile(transcriptDownload) {
  if (!transcriptDownload?.content || !transcriptDownload?.filename) return;

  const blob = new Blob([transcriptDownload.content], {
    type: transcriptDownload.mime || "text/plain;charset=utf-8",
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = transcriptDownload.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
