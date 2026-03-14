const markdownInput = document.getElementById("markdownInput");
const preview = document.getElementById("preview");
const fileInput = document.getElementById("fileInput");
const sampleBtn = document.getElementById("sampleBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const dropOverlay = document.getElementById("dropOverlay");
const wordCount = document.getElementById("wordCount");
const charCount = document.getElementById("charCount");
const readTime = document.getElementById("readTime");
const storageStatus = document.getElementById("storageStatus");

const LOCAL_DRAFT_KEY = "bloom-markdown-draft-v1";
const LOCAL_META_KEY = "bloom-markdown-meta-v1";

const SAMPLE_MARKDOWN = `# Bloom Markdown Viewer

Turn plain text into beautiful, readable pages instantly.

## Why this is handy

- Live preview while you type
- Safe rendering with sanitization
- Open local .md files
- Export your current draft anytime

## Quick formatting

### Blockquote
> Good writing starts with clear structure.

### Table
| Feature | Status |
| --- | --- |
| Live Rendering | Ready |
| Mobile Layout | Ready |
| Security Sanitization | Ready |

### Code
\`\`\`js
const message = "Hello markdown";
console.log(message);
\`\`\`
`;

marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false
});

let dragDepth = 0;
let saveTimeoutId;

function updateStats(rawText) {
  const trimmed = rawText.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = rawText.length;
  const minutes = Math.max(1, Math.ceil(words / 220));

  wordCount.textContent = `${words} word${words === 1 ? "" : "s"}`;
  charCount.textContent = `${chars} character${chars === 1 ? "" : "s"}`;
  readTime.textContent = `${words === 0 ? 0 : minutes} min read`;
}

function renderMarkdown() {
  const rawText = markdownInput.value;
  const parsed = marked.parse(rawText || "");
  preview.innerHTML = DOMPurify.sanitize(parsed);
  updateStats(rawText);
}

function updateStorageStatus(message) {
  if (!storageStatus) {
    return;
  }
  storageStatus.textContent = `Local save: ${message}`;
}

function saveDraftToLocalStorage(source = "updated") {
  try {
    localStorage.setItem(LOCAL_DRAFT_KEY, markdownInput.value);
    localStorage.setItem(
      LOCAL_META_KEY,
      JSON.stringify({
        source,
        savedAt: Date.now()
      })
    );
    updateStorageStatus("saved");
  } catch {
    updateStorageStatus("unavailable");
  }
}

function queueDraftSave(source = "updated") {
  window.clearTimeout(saveTimeoutId);
  saveTimeoutId = window.setTimeout(() => {
    saveDraftToLocalStorage(source);
  }, 180);
}

function loadDraftFromLocalStorage() {
  try {
    const savedDraft = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (savedDraft === null) {
      return false;
    }

    markdownInput.value = savedDraft;
    updateStorageStatus("restored");
    return true;
  } catch {
    updateStorageStatus("unavailable");
    return false;
  }
}

function clearLocalDraft() {
  try {
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    localStorage.removeItem(LOCAL_META_KEY);
    updateStorageStatus("cleared");
  } catch {
    updateStorageStatus("unavailable");
  }
}

function downloadCurrentMarkdown() {
  const blob = new Blob([markdownInput.value], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "notes.md";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function loadFileIntoEditor(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    markdownInput.value = String(reader.result || "");
    renderMarkdown();
    saveDraftToLocalStorage(`uploaded:${file.name || "file"}`);
  };
  reader.readAsText(file);
}

function hideDropOverlay() {
  dragDepth = 0;
  dropOverlay.classList.remove("active");
}

markdownInput.addEventListener("input", () => {
  renderMarkdown();
  queueDraftSave("typed");
});

fileInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  loadFileIntoEditor(file);
  fileInput.value = "";
});

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  window.addEventListener(eventName, (event) => {
    event.preventDefault();
  });
});

window.addEventListener("dragenter", (event) => {
  const hasFiles = Array.from(event.dataTransfer?.types || []).includes("Files");
  if (!hasFiles) {
    return;
  }

  dragDepth += 1;
  dropOverlay.classList.add("active");
});

window.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) {
    dropOverlay.classList.remove("active");
  }
});

window.addEventListener("drop", (event) => {
  hideDropOverlay();
  const file = event.dataTransfer?.files?.[0];
  loadFileIntoEditor(file);
});

window.addEventListener("blur", hideDropOverlay);

sampleBtn.addEventListener("click", () => {
  markdownInput.value = SAMPLE_MARKDOWN;
  renderMarkdown();
  saveDraftToLocalStorage("sample");
});

downloadBtn.addEventListener("click", downloadCurrentMarkdown);

clearBtn.addEventListener("click", () => {
  markdownInput.value = "";
  renderMarkdown();
  clearLocalDraft();
  markdownInput.focus();
});

if (!loadDraftFromLocalStorage()) {
  markdownInput.value = SAMPLE_MARKDOWN;
  saveDraftToLocalStorage("sample");
}
renderMarkdown();
