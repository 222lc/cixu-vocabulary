const STORAGE_KEY = "cixu-state-v1";

const sampleWords = [
  { en: "abandon", zh: "放弃；抛弃", phonetic: "əˈbændən", example: "Never abandon your goals." },
  { en: "benefit", zh: "益处；使受益", phonetic: "ˈbenɪfɪt", example: "Regular practice will benefit you." },
  { en: "cautious", zh: "谨慎的", phonetic: "ˈkɔːʃəs", example: "Be cautious with your time." },
  { en: "demonstrate", zh: "证明；演示", phonetic: "ˈdemənstreɪt", example: "She demonstrated how to solve it." },
  { en: "efficient", zh: "高效的", phonetic: "ɪˈfɪʃənt", example: "A short review is often efficient." },
  { en: "familiar", zh: "熟悉的", phonetic: "fəˈmɪliər", example: "The word is familiar to me now." },
  { en: "generate", zh: "产生；生成", phonetic: "ˈdʒenəreɪt", example: "The method generates good ideas." },
  { en: "hesitate", zh: "犹豫", phonetic: "ˈhezɪteɪt", example: "Do not hesitate to ask." },
  { en: "improve", zh: "改善；提高", phonetic: "ɪmˈpruːv", example: "Daily reading can improve vocabulary." },
  { en: "maintain", zh: "维持；保持", phonetic: "meɪnˈteɪn", example: "Maintain a steady pace." },
  { en: "opportunity", zh: "机会", phonetic: "ˌɒpəˈtjuːnəti", example: "Every mistake is a chance to learn." },
  { en: "reliable", zh: "可靠的", phonetic: "rɪˈlaɪəbl", example: "Consistent practice is reliable." },
];

const modeNames = {
  mixed: "混合随机",
  "en-zh": "英译中",
  "zh-en": "中译英",
  spelling: "拼写题",
};

const defaultState = {
  words: sampleWords.map(createWord),
  settings: {
    mode: "mixed",
    count: "10",
    optionCount: 4,
    weakFirst: true,
  },
  totals: {
    answered: 0,
    correct: 0,
    bestStreak: 0,
  },
  sync: {
    initialized: false,
    version: "",
    lastSync: "",
  },
};

let state = loadState();
let session = null;
let currentAnswerLocked = false;
let timerHandle = null;

const elements = {
  drawerScrim: document.querySelector("#drawerScrim"),
  openLibraryButton: document.querySelector("#openLibraryButton"),
  closeLibraryButton: document.querySelector("#closeLibraryButton"),
  addWordButton: document.querySelector("#addWordButton"),
  importButton: document.querySelector("#importButton"),
  exportButton: document.querySelector("#exportButton"),
  clearLibraryButton: document.querySelector("#clearLibraryButton"),
  wordSearch: document.querySelector("#wordSearch"),
  wordList: document.querySelector("#wordList"),
  libraryCount: document.querySelector("#libraryCount"),
  availableModeHint: document.querySelector("#availableModeHint"),
  headerStatus: document.querySelector("#headerStatus"),
  totalAnswered: document.querySelector("#totalAnswered"),
  overallAccuracy: document.querySelector("#overallAccuracy"),
  bestStreak: document.querySelector("#bestStreak"),
  overviewWords: document.querySelector("#overviewWords"),
  overviewWeak: document.querySelector("#overviewWeak"),
  overviewMastered: document.querySelector("#overviewMastered"),
  setupView: document.querySelector("#setupView"),
  quizView: document.querySelector("#quizView"),
  resultView: document.querySelector("#resultView"),
  modeGrid: document.querySelector("#modeGrid"),
  questionCount: document.querySelector("#questionCount"),
  optionCount: document.querySelector("#optionCount"),
  optionCountField: document.querySelector("#optionCountField"),
  weakFirst: document.querySelector("#weakFirst"),
  startButton: document.querySelector("#startButton"),
  questionModeLabel: document.querySelector("#questionModeLabel"),
  questionCounter: document.querySelector("#questionCounter"),
  progressBar: document.querySelector("#progressBar"),
  quitQuizButton: document.querySelector("#quitQuizButton"),
  directionLabel: document.querySelector("#directionLabel"),
  questionPrompt: document.querySelector("#questionPrompt"),
  phoneticText: document.querySelector("#phoneticText"),
  pronounceButton: document.querySelector("#pronounceButton"),
  optionsGrid: document.querySelector("#optionsGrid"),
  spellingForm: document.querySelector("#spellingForm"),
  spellingInput: document.querySelector("#spellingInput"),
  feedbackPanel: document.querySelector("#feedbackPanel"),
  feedbackIcon: document.querySelector("#feedbackIcon"),
  feedbackTitle: document.querySelector("#feedbackTitle"),
  feedbackText: document.querySelector("#feedbackText"),
  exampleText: document.querySelector("#exampleText"),
  nextButton: document.querySelector("#nextButton"),
  scoreRing: document.querySelector("#scoreRing"),
  scorePercent: document.querySelector("#scorePercent"),
  resultTitle: document.querySelector("#resultTitle"),
  resultSummary: document.querySelector("#resultSummary"),
  resultCorrect: document.querySelector("#resultCorrect"),
  resultWrong: document.querySelector("#resultWrong"),
  resultTime: document.querySelector("#resultTime"),
  resultStreak: document.querySelector("#resultStreak"),
  reviewSection: document.querySelector("#reviewSection"),
  reviewCount: document.querySelector("#reviewCount"),
  reviewList: document.querySelector("#reviewList"),
  backToSetupButton: document.querySelector("#backToSetupButton"),
  retryWrongButton: document.querySelector("#retryWrongButton"),
  restartButton: document.querySelector("#restartButton"),
  importDialog: document.querySelector("#importDialog"),
  importForm: document.querySelector("#importForm"),
  importText: document.querySelector("#importText"),
  importMessage: document.querySelector("#importMessage"),
  chooseFileButton: document.querySelector("#chooseFileButton"),
  fileInput: document.querySelector("#fileInput"),
  ocrPhotoButton: document.querySelector("#ocrPhotoButton"),
  ocrFileInput: document.querySelector("#ocrFileInput"),
  ocrStatus: document.querySelector("#ocrStatus"),
  ocrImportPanel: document.querySelector("#ocrImportPanel"),
  loadCuratedButton: document.querySelector("#loadCuratedButton"),
  curatedImportStatus: document.querySelector("#curatedImportStatus"),
  wordDialog: document.querySelector("#wordDialog"),
  wordForm: document.querySelector("#wordForm"),
  editingWordId: document.querySelector("#editingWordId"),
  wordModalEyebrow: document.querySelector("#wordModalEyebrow"),
  wordModalTitle: document.querySelector("#wordModalTitle"),
  wordEn: document.querySelector("#wordEn"),
  wordZh: document.querySelector("#wordZh"),
  wordPhonetic: document.querySelector("#wordPhonetic"),
  wordExample: document.querySelector("#wordExample"),
  wordMessage: document.querySelector("#wordMessage"),
  toastRegion: document.querySelector("#toastRegion"),
};

initialize();

function initialize() {
  applySavedSettings();
  bindEvents();
  renderLibrary();
  renderOverview();
  updateSessionSetup();
  configureHostedFeatures();
  void syncWordsFromCloud({ silent: true });
}

function configureHostedFeatures() {
  if (typeof location !== "undefined" && /\.github\.io$/i.test(location.hostname)) {
    elements.ocrImportPanel.hidden = true;
  }
}

function createWord(source, existing = {}) {
  const now = new Date().toISOString();
  return {
    id: source.id || createId(),
    en: String(source.en || "").trim(),
    zh: String(source.zh || "").trim(),
    phonetic: String(source.phonetic || "").trim(),
    example: String(source.example || "").trim(),
    createdAt: source.createdAt || now,
    updatedAt: source.updatedAt || now,
    seen: Number.isFinite(existing.seen) ? existing.seen : Number(source.seen) || 0,
    correct: Number.isFinite(existing.correct) ? existing.correct : Number(source.correct) || 0,
    wrong: Number.isFinite(existing.wrong) ? existing.wrong : Number(source.wrong) || 0,
  };
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `word-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const stored = JSON.parse(raw);
    const hasStoredWords = Array.isArray(stored.words);
    const words = hasStoredWords
      ? stored.words.map((word) => createWord(word)).filter((word) => word.en && word.zh)
      : [];

    return {
      words: hasStoredWords ? words : structuredClone(defaultState.words),
      settings: {
        ...defaultState.settings,
        ...(stored.settings || {}),
      },
      totals: {
        ...defaultState.totals,
        ...(stored.totals || {}),
      },
      sync: {
        ...defaultState.sync,
        ...(stored.sync || {}),
      },
    };
  } catch (error) {
    console.warn("无法读取本地词库，已使用默认词库。", error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    showToast("本机存储空间不足，本次更改可能无法保留。", "error");
    console.warn("无法保存词库。", error);
  }
}

function applySavedSettings() {
  const settings = state.settings;
  elements.questionCount.value = settings.count;
  elements.optionCount.value = String(settings.optionCount);
  elements.weakFirst.checked = Boolean(settings.weakFirst);
  const selectedMode = elements.modeGrid.querySelector(`[data-mode="${settings.mode}"]`);
  if (selectedMode) {
    elements.modeGrid.querySelector(".selected")?.classList.remove("selected");
    selectedMode.classList.add("selected");
  }
  updateOptionCountVisibility();
}

function bindEvents() {
  elements.openLibraryButton.addEventListener("click", openLibrary);
  elements.closeLibraryButton.addEventListener("click", closeLibrary);
  elements.drawerScrim.addEventListener("click", closeLibrary);
  elements.addWordButton.addEventListener("click", () => openWordDialog());
  elements.importButton.addEventListener("click", openImportDialog);
  elements.exportButton.addEventListener("click", exportWords);
  elements.clearLibraryButton.addEventListener("click", clearLibrary);
  elements.wordSearch.addEventListener("input", renderLibrary);
  elements.wordList.addEventListener("click", handleWordListAction);
  elements.modeGrid.addEventListener("click", handleModeSelection);
  elements.questionCount.addEventListener("change", persistSettings);
  elements.optionCount.addEventListener("change", persistSettings);
  elements.weakFirst.addEventListener("change", persistSettings);
  elements.startButton.addEventListener("click", () => startSession());
  elements.quitQuizButton.addEventListener("click", endSessionEarly);
  elements.optionsGrid.addEventListener("click", handleOptionClick);
  elements.spellingForm.addEventListener("submit", handleSpellingSubmit);
  elements.nextButton.addEventListener("click", nextQuestion);
  elements.pronounceButton.addEventListener("click", pronounceCurrentWord);
  elements.backToSetupButton.addEventListener("click", showSetup);
  elements.retryWrongButton.addEventListener("click", retryWrongWords);
  elements.restartButton.addEventListener("click", () => startSession());
  elements.importForm.addEventListener("submit", handleImportSubmit);
  elements.chooseFileButton.addEventListener("click", () => elements.fileInput.click());
  elements.fileInput.addEventListener("change", handleFileSelection);
  elements.ocrPhotoButton.addEventListener("click", () => elements.ocrFileInput.click());
  elements.ocrFileInput.addEventListener("change", handleOcrPhotoSelection);
  elements.loadCuratedButton.addEventListener("click", loadCuratedWords);
  elements.wordForm.addEventListener("submit", handleWordSubmit);
  [elements.importDialog, elements.wordDialog].forEach((dialog) => {
    dialog.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => dialog.close());
    });
  });
  document.addEventListener("keydown", handleKeyboard);

  elements.importDialog.addEventListener("click", (event) => {
    if (event.target === elements.importDialog) elements.importDialog.close();
  });

  elements.wordDialog.addEventListener("click", (event) => {
    if (event.target === elements.wordDialog) elements.wordDialog.close();
  });
}

function openLibrary() {
  document.body.classList.add("library-open");
}

function closeLibrary() {
  document.body.classList.remove("library-open");
}

function handleModeSelection(event) {
  const button = event.target.closest("[data-mode]");
  if (!button) return;
  elements.modeGrid.querySelector(".selected")?.classList.remove("selected");
  button.classList.add("selected");
  state.settings.mode = button.dataset.mode;
  updateOptionCountVisibility();
  persistSettings();
}

function persistSettings() {
  state.settings.count = elements.questionCount.value;
  state.settings.optionCount = Number(elements.optionCount.value);
  state.settings.weakFirst = elements.weakFirst.checked;
  saveState();
  updateSessionSetup();
}

function updateOptionCountVisibility() {
  const spellingMode = state.settings.mode === "spelling";
  elements.optionCountField.style.visibility = spellingMode ? "hidden" : "visible";
}

function updateSessionSetup() {
  const validWords = getValidWords();
  const mode = state.settings.mode;
  const canStart =
    validWords.length > 0 &&
    (mode === "spelling" || validWords.length >= 2);

  elements.startButton.disabled = !canStart;
  elements.overviewWords.textContent = String(state.words.length);
  elements.libraryCount.textContent = `${state.words.length} 个词`;

  if (!state.words.length) {
    elements.availableModeHint.textContent = "请先添加单词";
  } else if (mode !== "spelling" && validWords.length < 2) {
    elements.availableModeHint.textContent = "选择题至少需要 2 个词";
  } else {
    const count =
      state.settings.count === "all"
        ? validWords.length
        : Math.min(Number(state.settings.count), validWords.length);
    elements.availableModeHint.textContent = `本轮 ${count} 题`;
  }
}

function getValidWords() {
  return state.words.filter((word) => word.en && word.zh);
}

function renderLibrary() {
  const query = elements.wordSearch.value.trim().toLocaleLowerCase();
  const words = [...state.words]
    .filter((word) => {
      if (!query) return true;
      return (
        word.en.toLocaleLowerCase().includes(query) ||
        word.zh.toLocaleLowerCase().includes(query) ||
        word.phonetic.toLocaleLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.en.localeCompare(b.en, "en"));

  elements.libraryCount.textContent = `${state.words.length} 个词`;

  if (!words.length) {
    elements.wordList.innerHTML = `
      <div class="empty-library">
        ${icon("book")}
        <strong>${query ? "没有匹配的单词" : "词库还是空的"}</strong>
        <p>${query ? "换一个英文或中文关键词试试。" : "添加单词或批量导入你自己的词汇。"}</p>
      </div>
    `;
    return;
  }

  elements.wordList.innerHTML = words
    .map((word) => {
      const level = getMasteryLevel(word);
      const safeEn = escapeHtml(word.en);
      const safeZh = escapeHtml(word.zh);
      return `
        <article class="word-row" data-id="${word.id}">
          <span class="mastery-dot ${level.className}" title="${level.label}"></span>
          <div class="word-main">
            <strong title="${safeEn}">${safeEn}</strong>
            <span title="${safeZh}">${safeZh}</span>
          </div>
          <div class="word-actions">
            <button class="row-icon-button" type="button" data-action="speak" aria-label="朗读 ${safeEn}" title="朗读">
              ${icon("volume")}
            </button>
            <button class="row-icon-button" type="button" data-action="edit" aria-label="编辑 ${safeEn}" title="编辑">
              ${icon("edit")}
            </button>
            <button class="row-icon-button danger" type="button" data-action="delete" aria-label="删除 ${safeEn}" title="删除">
              ${icon("trash")}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function getMasteryLevel(word) {
  if (!word.seen) return { className: "", label: "尚未练习" };
  const accuracy = word.correct / word.seen;
  if (word.seen >= 3 && accuracy >= 0.8) {
    return { className: "mastered", label: "掌握良好" };
  }
  if (accuracy < 0.6 || word.wrong > word.correct) {
    return { className: "learning", label: "需要加强" };
  }
  return { className: "", label: "正在学习" };
}

function renderOverview() {
  const words = state.words;
  const weak = words.filter((word) => word.wrong > word.correct).length;
  const mastered = words.filter(
    (word) => word.seen >= 3 && word.correct / word.seen >= 0.8,
  ).length;
  const accuracy = state.totals.answered
    ? Math.round((state.totals.correct / state.totals.answered) * 100)
    : null;

  elements.overviewWeak.textContent = String(weak);
  elements.overviewMastered.textContent = String(mastered);
  elements.totalAnswered.textContent = String(state.totals.answered);
  elements.overallAccuracy.textContent = accuracy === null ? "--" : `${accuracy}%`;
  elements.bestStreak.textContent = String(state.totals.bestStreak);
  updateSessionSetup();
}

function handleWordListAction(event) {
  const button = event.target.closest("[data-action]");
  const row = event.target.closest(".word-row");
  if (!button || !row) return;
  const word = state.words.find((item) => item.id === row.dataset.id);
  if (!word) return;

  if (button.dataset.action === "speak") {
    speak(word.en);
  } else if (button.dataset.action === "edit") {
    openWordDialog(word);
  } else if (button.dataset.action === "delete") {
    deleteWord(word);
  }
}

function openWordDialog(word = null) {
  closeLibrary();
  elements.wordForm.reset();
  elements.wordMessage.textContent = "";
  elements.editingWordId.value = word?.id || "";
  elements.wordModalEyebrow.textContent = word ? "编辑词条" : "添加单词";
  elements.wordModalTitle.textContent = word ? "更新单词内容" : "新建词条";
  elements.wordEn.value = word?.en || "";
  elements.wordZh.value = word?.zh || "";
  elements.wordPhonetic.value = word?.phonetic || "";
  elements.wordExample.value = word?.example || "";
  elements.wordDialog.showModal();
  window.setTimeout(() => elements.wordEn.focus(), 40);
}

function handleWordSubmit(event) {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const id = elements.editingWordId.value;
  const en = elements.wordEn.value.trim();
  const zh = elements.wordZh.value.trim();
  const phonetic = elements.wordPhonetic.value.trim();
  const example = elements.wordExample.value.trim();

  if (!en || !zh) {
    elements.wordMessage.textContent = "英文单词和中文释义不能为空。";
    return;
  }

  const existingIndex = state.words.findIndex(
    (word) =>
      word.id !== id &&
      normalize(word.en) === normalize(en) &&
      normalize(word.zh) === normalize(zh),
  );

  if (existingIndex >= 0) {
    elements.wordMessage.textContent = "词库中已经有相同的中英文词条。";
    return;
  }

  if (id) {
    const index = state.words.findIndex((word) => word.id === id);
    if (index < 0) return;
    state.words[index] = {
      ...state.words[index],
      en,
      zh,
      phonetic,
      example,
      updatedAt: new Date().toISOString(),
    };
    showToast("单词已更新。");
  } else {
    const existing = state.words.find(
      (word) => normalize(word.en) === normalize(en) && normalize(word.zh) === normalize(zh),
    );
    state.words.push(createWord({ en, zh, phonetic, example }, existing));
    showToast("单词已添加。");
  }

  saveState();
  renderLibrary();
  renderOverview();
  elements.wordDialog.close();
  elements.wordSearch.value = "";
}

function deleteWord(word) {
  if (!window.confirm(`确定删除“${word.en}”吗？`)) return;
  state.words = state.words.filter((item) => item.id !== word.id);
  saveState();
  renderLibrary();
  renderOverview();
  showToast("单词已删除。");
}

function clearLibrary() {
  if (!state.words.length) return;
  if (!window.confirm("确定清空整个词库吗？此操作无法撤销。")) return;
  state.words = [];
  saveState();
  renderLibrary();
  renderOverview();
  showToast("词库已清空。");
}

function openImportDialog() {
  closeLibrary();
  elements.importMessage.textContent = "";
  elements.importMessage.classList.remove("error");
  elements.importText.value = "";
  elements.ocrStatus.textContent = "可一次选择多张图片，识别后自动整理";
  elements.curatedImportStatus.textContent = "";
  elements.ocrPhotoButton.disabled = false;
  elements.importDialog.showModal();
  window.setTimeout(() => elements.importText.focus(), 40);
}

function handleFileSelection() {
  const file = elements.fileInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    elements.importText.value = String(reader.result || "");
    elements.importMessage.textContent = `已读取 ${file.name}`;
    elements.importMessage.classList.remove("error");
  });
  reader.addEventListener("error", () => {
    elements.importMessage.textContent = "文件读取失败，请换一个文本文件。";
    elements.importMessage.classList.add("error");
  });
  reader.readAsText(file);
  elements.fileInput.value = "";
}

async function loadCuratedWords() {
  elements.loadCuratedButton.disabled = true;
  elements.curatedImportStatus.textContent = "正在载入";
  try {
    const response = await fetch("./curated-words.txt", { cache: "no-store" });
    if (!response.ok) throw new Error("还没有可用的校对词表。");
    const text = (await response.text()).trim();
    if (!text) throw new Error("校对词表为空。");
    elements.importText.value = text;
    elements.importMessage.textContent = "校对词表已载入，请检查后导入。";
    elements.importMessage.classList.remove("error");
    elements.curatedImportStatus.textContent = "已载入";
    elements.importText.focus();
  } catch (error) {
    elements.importMessage.textContent = error.message;
    elements.importMessage.classList.add("error");
    elements.curatedImportStatus.textContent = "载入失败";
  } finally {
    elements.loadCuratedButton.disabled = false;
  }
}

async function syncWordsFromCloud({ silent = false } = {}) {
  if (typeof location === "undefined" || location.protocol === "file:") return false;

  try {
    const response = await fetch("./curated-words.txt", { cache: "no-store" });
    if (!response.ok) throw new Error("无法读取云端词表。");
    const text = (await response.text()).trim();
    if (!text) throw new Error("云端词表为空。");
    const version = hashText(text);
    if (state.sync.version === version) return false;

    const parsed = parseImportText(text);
    if (!parsed.words.length) throw new Error("云端词表格式无效。");

    const sampleKeys = new Set(sampleWords.map((word) => wordKey(word)));
    const onlyDefaultWords =
      state.words.length === 0 ||
      state.words.every((word) => sampleKeys.has(wordKey(word)));

    if (!state.sync.initialized && onlyDefaultWords) {
      state.words = parsed.words.map((word) => createWord(word));
    } else {
      parsed.words.forEach((source) => {
        const existing = state.words.find((word) => normalize(word.en) === normalize(source.en));
        if (existing) {
          existing.zh = source.zh;
          existing.phonetic = source.phonetic || existing.phonetic;
          existing.example = source.example || existing.example;
          existing.updatedAt = new Date().toISOString();
        } else {
          state.words.push(createWord(source));
        }
      });
    }

    state.sync = {
      initialized: true,
      version,
      lastSync: new Date().toISOString(),
    };
    saveState();
    renderLibrary();
    renderOverview();
    if (!silent) showToast(`云端词表已同步，共 ${parsed.words.length} 个单词。`);
    return true;
  } catch (error) {
    if (!silent) showToast(error.message || "云端词表同步失败。", "error");
    return false;
  }
}

function hashText(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function handleImportSubmit(event) {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const preparedText = prepareImportText(elements.importText.value);
  elements.importText.value = preparedText;
  const parsed = parseImportText(preparedText);
  if (parsed.error) {
    elements.importMessage.textContent = parsed.error;
    elements.importMessage.classList.add("error");
    return;
  }
  if (!parsed.words.length) {
    elements.importMessage.textContent = "没有识别到有效的单词，请检查每行格式。";
    elements.importMessage.classList.add("error");
    return;
  }

  const mode = new FormData(elements.importForm).get("importMode");
  const incoming = parsed.words.map((word) => {
    const existing = state.words.find(
      (item) => normalize(item.en) === normalize(word.en) && normalize(item.zh) === normalize(word.zh),
    );
    return createWord(word, existing);
  });

  if (mode === "replace") {
    state.words = incoming;
  } else {
    const byKey = new Map(state.words.map((word) => [wordKey(word), word]));
    incoming.forEach((word) => {
      const existing = byKey.get(wordKey(word));
      if (existing) {
        Object.assign(existing, {
          en: word.en,
          zh: word.zh,
          phonetic: word.phonetic || existing.phonetic,
          example: word.example || existing.example,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const duplicateIndex = state.words.findIndex((item) => wordKey(item) === wordKey(word));
        if (duplicateIndex < 0) state.words.push(word);
      }
    });
  }

  saveState();
  renderLibrary();
  renderOverview();
  elements.importDialog.close();
  elements.importText.value = "";
  showToast(
    parsed.warning
      ? `已导入 ${parsed.words.length} 个单词；${parsed.warning}`
      : `已导入 ${parsed.words.length} 个单词。`,
    parsed.warning ? "error" : "success",
  );
}

async function handleOcrPhotoSelection(event) {
  const files = [...(event.target.files || [])].filter((file) => file.type.startsWith("image/"));
  elements.ocrFileInput.value = "";
  if (!files.length) return;

  if (location.protocol === "file:") {
    elements.ocrStatus.textContent = "请通过局域网地址打开后再使用拍照识别";
    elements.importMessage.textContent = "直接打开文件时无法调用本机 OCR，请先运行 start-mobile.ps1。";
    elements.importMessage.classList.add("error");
    return;
  }

  elements.ocrPhotoButton.disabled = true;
  const recognized = [];
  const failed = [];

  for (let index = 0; index < files.length; index += 1) {
    elements.ocrStatus.textContent = `正在识别 ${index + 1} / ${files.length}`;
    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": files[index].type || "application/octet-stream" },
        body: files[index],
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "图片识别失败。");
      const formatted = formatOcrText(result.text || "");
      if (formatted) recognized.push(formatted);
    } catch (error) {
      failed.push(error.message || "图片识别失败。");
    }
  }

  if (recognized.length) {
    const currentText = elements.importText.value.trim();
    elements.importText.value = [currentText, ...recognized].filter(Boolean).join("\n");
    elements.ocrStatus.textContent = `已识别 ${recognized.length} 张图片，请校对后导入`;
    elements.importMessage.textContent = "识别结果已整理，请快速检查拼写和释义。";
    elements.importMessage.classList.remove("error");
    elements.importText.focus();
  }

  if (failed.length) {
    elements.ocrStatus.textContent = recognized.length
      ? `完成 ${recognized.length} 张，失败 ${failed.length} 张`
      : "识别失败，请换一张更清晰的照片";
    elements.importMessage.textContent = failed[0];
    elements.importMessage.classList.add("error");
  }

  elements.ocrPhotoButton.disabled = false;
}

function prepareImportText(text) {
  const value = String(text || "");
  const direct = parseImportText(value);
  if (direct.words.length && !direct.error) return value;

  const formatted = formatOcrText(value);
  return parseImportText(formatted).words.length ? formatted : value;
}

function formatOcrText(rawText) {
  let text = String(rawText || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/([\p{Script=Han}，。；！？、：（）])\s+(?=[\p{Script=Han}，。；！？、：（）])/gu, "$1")
    .replace(/([，。；！？、：）])\s+(?=[\p{Script=Han}])/gu, "$1")
    .replace(/([\p{Script=Han}])\s+(?=[，。；！？、：）])/gu, "$1");

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const packedEntries = lines
    .flatMap((line) => splitPackedOcrLine(line))
    .map(parseOcrSegment)
    .filter(Boolean);

  if (packedEntries.length >= Math.ceil(lines.length * 0.6)) {
    return packedEntries.join("\n");
  }

  const pairedEntries = [];
  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];
    const next = lines[index + 1];
    if (next && isEnglishOnlyLine(current) && containsChinese(next)) {
      pairedEntries.push(`${cleanEnglishToken(current)} | ${cleanChineseText(next)}`);
      index += 1;
    } else {
      const parsed = parseOcrSegment(current);
      if (parsed) pairedEntries.push(parsed);
      else if (containsChinese(current)) pairedEntries.push(`? | ${cleanChineseText(current)}`);
    }
  }

  return pairedEntries.join("\n");
}

function splitPackedOcrLine(line) {
  return line
    .replace(/^\s*(?:\d+[.)、]\s*)/, "")
    .replace(
      /([\p{Script=Han}，。；！？、）])\s+(?=[A-Za-z][A-Za-z'-]{1,}(?:\s|$))/gu,
      "$1\n",
    )
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOcrSegment(segment) {
  const value = segment.trim().replace(/^\s*(?:\d+[.)、]\s*)/, "");
  if (!value || value.includes("|") || value.includes("\t")) return value || null;

  const firstChineseIndex = value.search(/\p{Script=Han}/u);
  if (firstChineseIndex <= 0) return null;

  const english = cleanEnglishToken(value.slice(0, firstChineseIndex));
  const chinese = cleanChineseText(value.slice(firstChineseIndex));
  if (!english || !chinese) return null;
  return `${english} | ${chinese}`;
}

function cleanEnglishToken(value) {
  return String(value || "")
    .replace(/\b(?:n|v|vt|vi|adj|adv|prep|pron|conj|num|int)\.\s*/gi, "")
    .replace(/^[\s:：\-–—]+|[\s:：\-–—]+$/g, "")
    .trim();
}

function cleanChineseText(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/^[\s:：\-–—]+|[\s:：\-–—]+$/g, "")
    .trim();
}

function isEnglishOnlyLine(value) {
  return /^[A-Za-z][A-Za-z' -]*$/.test(String(value || "").trim());
}

function containsChinese(value) {
  return /\p{Script=Han}/u.test(String(value || ""));
}

function parseImportText(text) {
  const lines = String(text).split(/\r?\n/);
  const words = [];
  const invalidLines = [];

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;
    const delimiter = line.includes("\t") ? "\t" : line.includes("|") ? "|" : ",";
    const parts = line.split(delimiter).map((part) => part.trim());

    if (parts.length < 2 || !parts[0] || !parts[1]) {
      invalidLines.push(index + 1);
      return;
    }

    words.push({
      en: parts[0],
      zh: parts[1],
      phonetic: parts[2] || "",
      example: parts.slice(3).join(delimiter).trim(),
    });
  });

  if (!words.length && invalidLines.length) {
    return { error: "每行至少需要“英文 | 中文”两部分。" };
  }
  if (invalidLines.length) {
    return {
      words,
      warning: `已忽略第 ${invalidLines.join("、")} 行，请确认这些行包含英文和中文。`,
    };
  }
  return { words };
}

function exportWords() {
  if (!state.words.length) {
    showToast("词库为空，暂时没有可导出的内容。", "error");
    return;
  }
  const content = state.words
    .map((word) => [word.en, word.zh, word.phonetic, word.example].join("\t"))
    .join("\n");
  const blob = new Blob([content], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `词序词库-${formatDateForFile(new Date())}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("词库已导出。");
}

function startSession(options = {}) {
  const pool = options.words?.length ? [...options.words] : getValidWords();
  const mode = options.mode || state.settings.mode;
  const requestedCount =
    options.words?.length || state.settings.count === "all"
      ? options.words?.length || pool.length
      : Number(state.settings.count);

  if (!pool.length || (mode !== "spelling" && pool.length < 2)) {
    showToast(mode !== "spelling" && pool.length < 2 ? "选择题至少需要 2 个单词。" : "请先添加单词。", "error");
    return;
  }

  const ordered = orderWords(pool, options.words ? false : state.settings.weakFirst);
  const selected = ordered.slice(0, Math.min(requestedCount, ordered.length));
  const questions = selected.map((word) => buildQuestion(word, pool, mode));

  session = {
    mode,
    pool,
    questions,
    currentIndex: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    wrongWords: [],
    startedAt: Date.now(),
    elapsedSeconds: 0,
    finished: false,
  };
  currentAnswerLocked = false;

  elements.setupView.hidden = true;
  elements.resultView.hidden = true;
  elements.quizView.hidden = false;
  closeLibrary();
  startTimer();
  renderQuestion();
}

function orderWords(pool, weakFirst) {
  if (!weakFirst) return shuffle([...pool]);
  return [...pool]
    .map((word) => {
      const accuracy = word.seen ? word.correct / word.seen : 0.45;
      const weakScore = 1 - accuracy;
      const uncertainty = Math.random() * 0.9;
      return { word, score: weakScore * 2 + word.wrong * 0.22 + uncertainty };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.word);
}

function buildQuestion(word, pool, mode) {
  if (mode === "spelling") {
    return {
      word,
      type: "spelling",
      direction: "spelling",
    };
  }

  const direction = mode === "mixed" ? (Math.random() < 0.5 ? "en-zh" : "zh-en") : mode;
  const target = direction === "en-zh" ? word.zh : word.en;
  const field = direction === "en-zh" ? "zh" : "en";
  const matchField = direction === "en-zh" ? "en" : "zh";
  const otherWords = pool.filter((item) => item.id !== word.id);
  const uniqueDistractors = [];
  const seen = new Set([normalize(target)]);

  shuffle(otherWords).forEach((item) => {
    const value = item[field];
    if (value && !seen.has(normalize(value))) {
      seen.add(normalize(value));
      uniqueDistractors.push({
        value,
        match: item[matchField],
      });
    }
  });

  const optionTotal = Math.min(state.settings.optionCount, uniqueDistractors.length + 1);
  const options = shuffle([
    {
      value: target,
      match: word[matchField],
    },
    ...uniqueDistractors.slice(0, optionTotal - 1),
  ]);
  return {
    word,
    type: "choice",
    direction,
    target,
    options,
  };
}

function renderQuestion() {
  if (!session) return;
  currentAnswerLocked = false;
  const question = session.questions[session.currentIndex];
  if (!question) {
    finishSession();
    return;
  }

  elements.questionModeLabel.textContent = modeNames[session.mode] || "练习";
  elements.questionCounter.textContent = `第 ${session.currentIndex + 1} / ${session.questions.length} 题`;
  elements.progressBar.style.width = `${(session.currentIndex / session.questions.length) * 100}%`;
  elements.feedbackPanel.hidden = true;
  elements.feedbackPanel.classList.remove("error");
  elements.optionsGrid.innerHTML = "";
  elements.spellingForm.hidden = true;
  elements.optionsGrid.hidden = false;

  if (question.type === "spelling") {
    elements.directionLabel.textContent = "中译英 · 拼写";
    elements.questionPrompt.textContent = question.word.zh;
    elements.phoneticText.textContent = question.word.phonetic || "";
    elements.optionsGrid.hidden = true;
    elements.spellingForm.hidden = false;
    elements.spellingInput.value = "";
    elements.spellingInput.disabled = false;
    elements.spellingForm.querySelector("button").disabled = false;
    window.setTimeout(() => elements.spellingInput.focus(), 30);
    return;
  }

  elements.directionLabel.textContent = modeNames[question.direction];
  elements.questionPrompt.textContent =
    question.direction === "en-zh" ? question.word.en : question.word.zh;
  elements.phoneticText.textContent =
    question.direction === "en-zh" ? question.word.phonetic || "" : "";

  elements.optionsGrid.innerHTML = question.options
    .map(
      (option, index) => `
        <button class="option-button" type="button" data-option="${escapeAttribute(option.value)}">
          <span class="option-key">${index + 1}</span>
          <span class="option-copy">
            <span class="option-primary">${escapeHtml(option.value)}</span>
            <span class="option-match" hidden>${escapeHtml(option.match)}</span>
          </span>
          <span class="option-state" aria-hidden="true"></span>
        </button>
      `,
    )
    .join("");
}

function handleOptionClick(event) {
  const button = event.target.closest(".option-button");
  if (!button || currentAnswerLocked || !session) return;
  const question = session.questions[session.currentIndex];
  const answer = button.dataset.option;
  const isCorrect = normalize(answer) === normalize(question.target);
  revealChoiceAnswer(button, isCorrect);
  submitAnswer(isCorrect, answer, question.target);
}

function revealChoiceAnswer(selectedButton, isCorrect) {
  [...elements.optionsGrid.querySelectorAll(".option-button")].forEach((button) => {
    button.disabled = true;
    button.querySelector(".option-match").hidden = false;
    if (normalize(button.dataset.option) === normalize(session.questions[session.currentIndex].target)) {
      button.classList.add("correct");
      button.querySelector(".option-state").innerHTML = icon("check");
    } else if (button === selectedButton && !isCorrect) {
      button.classList.add("wrong");
      button.querySelector(".option-state").innerHTML = icon("x");
    } else {
      button.classList.add("dimmed");
    }
  });
}

function handleSpellingSubmit(event) {
  event.preventDefault();
  if (currentAnswerLocked || !session) return;
  const question = session.questions[session.currentIndex];
  const answer = elements.spellingInput.value.trim();
  if (!answer) {
    elements.spellingInput.focus();
    return;
  }
  const isCorrect = normalize(answer) === normalize(question.word.en);
  elements.spellingInput.disabled = true;
  elements.spellingForm.querySelector("button").disabled = true;
  submitAnswer(isCorrect, answer, question.word.en);
}

function submitAnswer(isCorrect, answer, expected) {
  currentAnswerLocked = true;
  const question = session.questions[session.currentIndex];
  const word = question.word;
  word.seen += 1;
  state.totals.answered += 1;

  if (isCorrect) {
    word.correct += 1;
    state.totals.correct += 1;
    session.correct += 1;
    session.streak += 1;
    session.bestStreak = Math.max(session.bestStreak, session.streak);
    state.totals.bestStreak = Math.max(state.totals.bestStreak, session.streak);
    showFeedback(true, answer, expected, word);
  } else {
    word.wrong += 1;
    session.wrong += 1;
    session.streak = 0;
    session.wrongWords.push(word);
    showFeedback(false, answer, expected, word);
  }

  saveState();
  renderOverview();
  renderLibrary();
}

function showFeedback(isCorrect, answer, expected, word) {
  elements.feedbackPanel.hidden = false;
  elements.feedbackPanel.classList.toggle("error", !isCorrect);
  elements.feedbackIcon.innerHTML = icon(isCorrect ? "check" : "x");
  elements.feedbackTitle.textContent = isCorrect ? "回答正确" : "再记一遍";

  if (isCorrect) {
    elements.feedbackText.textContent = `${word.en}：${word.zh}`;
  } else {
    const answerText = answer ? `你的答案：${answer}。` : "";
    elements.feedbackText.textContent = `${answerText}正确答案：${expected}`;
  }

  elements.exampleText.hidden = !word.example;
  elements.exampleText.textContent = word.example ? `“${word.example}”` : "";

  const isLast = session.currentIndex >= session.questions.length - 1;
  elements.nextButton.querySelector("span").textContent = isLast ? "查看结果" : "下一题";
  window.setTimeout(() => elements.nextButton.focus(), 40);
}

function nextQuestion() {
  if (!session) return;
  if (session.currentIndex >= session.questions.length - 1) {
    finishSession();
    return;
  }
  session.currentIndex += 1;
  renderQuestion();
}

function finishSession() {
  if (!session) return;
  session.finished = true;
  session.elapsedSeconds = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000));
  stopTimer();

  const total = session.correct + session.wrong;
  const percent = total ? Math.round((session.correct / total) * 100) : 0;
  elements.setupView.hidden = true;
  elements.quizView.hidden = true;
  elements.resultView.hidden = false;
  elements.scoreRing.style.setProperty("--score", String(percent));
  elements.scorePercent.textContent = `${percent}%`;
  elements.resultCorrect.textContent = String(session.correct);
  elements.resultWrong.textContent = String(session.wrong);
  elements.resultTime.textContent = formatDuration(session.elapsedSeconds);
  elements.resultStreak.textContent = String(session.bestStreak);

  if (percent >= 90) {
    elements.resultTitle.textContent = "这组掌握得很稳";
  } else if (percent >= 70) {
    elements.resultTitle.textContent = "已经进入状态";
  } else {
    elements.resultTitle.textContent = "先把错题拿下";
  }
  elements.resultSummary.textContent =
    session.wrong > 0
      ? `本轮有 ${session.wrong} 个词需要再看一遍，重练错题会比重新开始更有效。`
      : "所有题目都答对了，可以换一组词继续巩固。";

  renderWrongReview();
  elements.retryWrongButton.hidden = session.wrongWords.length === 0;
  elements.restartButton.focus();
}

function renderWrongReview() {
  const uniqueWrong = [];
  const seen = new Set();
  session.wrongWords.forEach((word) => {
    if (!seen.has(word.id)) {
      seen.add(word.id);
      uniqueWrong.push(word);
    }
  });

  elements.reviewSection.hidden = uniqueWrong.length === 0;
  elements.reviewCount.textContent = `${uniqueWrong.length} 个`;
  elements.reviewList.innerHTML = uniqueWrong
    .map(
      (word) => `
        <div class="review-row">
          <strong>${escapeHtml(word.en)}</strong>
          <span>${escapeHtml(word.zh)}</span>
          <button class="row-icon-button" type="button" data-speak="${escapeAttribute(word.en)}" aria-label="朗读 ${escapeAttribute(word.en)}" title="朗读">
            ${icon("volume")}
          </button>
        </div>
      `,
    )
    .join("");

  elements.reviewList.onclick = (event) => {
    const button = event.target.closest("[data-speak]");
    if (button) speak(button.dataset.speak);
  };
}

function retryWrongWords() {
  if (!session) return;
  const uniqueWrong = [];
  const seen = new Set();
  session.wrongWords.forEach((word) => {
    if (!seen.has(word.id)) {
      seen.add(word.id);
      uniqueWrong.push(word);
    }
  });
  if (!uniqueWrong.length) return;
  const retryMode =
    uniqueWrong.length < 2 && state.settings.mode !== "spelling"
      ? "spelling"
      : state.settings.mode;
  startSession({
    words: uniqueWrong,
    mode: retryMode,
  });
}

function endSessionEarly() {
  if (!session) return;
  if (!window.confirm("确定结束本轮练习并查看当前结果吗？")) return;
  stopTimer();
  finishSession();
}

function showSetup() {
  stopTimer();
  session = null;
  elements.quizView.hidden = true;
  elements.resultView.hidden = true;
  elements.setupView.hidden = false;
  renderOverview();
}

function startTimer() {
  stopTimer();
  timerHandle = window.setInterval(() => {
    if (!session || session.finished) return;
    const elapsed = Math.round((Date.now() - session.startedAt) / 1000);
    elements.headerStatus.textContent = `本轮已用时 ${formatDuration(elapsed)}`;
  }, 1000);
}

function stopTimer() {
  if (timerHandle) window.clearInterval(timerHandle);
  timerHandle = null;
  elements.headerStatus.textContent = "词库已保存在本机";
}

function pronounceCurrentWord() {
  if (!session) return;
  const question = session.questions[session.currentIndex];
  speak(question.word.en);
}

function speak(text) {
  if (!("speechSynthesis" in window) || !text) {
    showToast("当前浏览器不支持朗读。", "error");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.86;
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find((voice) => /^en-(US|GB)/i.test(voice.lang));
  if (preferredVoice) utterance.voice = preferredVoice;
  window.speechSynthesis.speak(utterance);
}

function handleKeyboard(event) {
  if (!session || elements.quizView.hidden || currentAnswerLocked) return;
  const question = session.questions[session.currentIndex];
  if (question.type === "choice" && /^[1-5]$/.test(event.key)) {
    const button = elements.optionsGrid.querySelectorAll(".option-button")[Number(event.key) - 1];
    if (button) {
      event.preventDefault();
      button.click();
    }
    return;
  }

  if (question.type === "spelling" && event.key === "Enter") {
    event.preventDefault();
    elements.spellingForm.requestSubmit();
  }
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }
  return items;
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

function wordKey(word) {
  return `${normalize(word.en)}\u0000${normalize(word.zh)}`;
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDateForFile(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.innerHTML = `${icon(type === "error" ? "x" : "check")}<span>${escapeHtml(message)}</span>`;
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function icon(name) {
  const paths = {
    book: `
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    `,
    volume: `
      <path d="M11 5 6 9H3v6h3l5 4z"/>
      <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
      <path d="M18.5 5.5a9 9 0 0 1 0 13"/>
    `,
    edit: `
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>
    `,
    trash: `
      <path d="M3 6h18"/>
      <path d="M8 6V4h8v2"/>
      <path d="m19 6-1 14H6L5 6"/>
      <path d="M10 11v5"/>
      <path d="M14 11v5"/>
    `,
    check: `<path d="m5 12 4 4L19 6"/>`,
    x: `
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    `,
  };

  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${paths[name] || ""}</svg>`;
}
