import fs from "node:fs";
import vm from "node:vm";

class FakeElement {
  constructor() {
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.innerHTML = "";
    this.textContent = "";
    this.dataset = {};
    this.style = {
      setProperty(name, value) {
        this[name] = value;
      },
    };
    this.classList = {
      add() {},
      remove() {},
      toggle() {},
    };
  }

  addEventListener() {}
  querySelector() {
    return new FakeElement();
  }
  querySelectorAll() {
    return [];
  }
  closest() {
    return null;
  }
  focus() {}
  showModal() {}
  close() {}
  reset() {}
  append() {}
  remove() {}
  requestSubmit() {}
}

function createContext(storage = new Map()) {
  const elements = new Map();
  const document = {
    body: new FakeElement(),
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, new FakeElement());
      return elements.get(selector);
    },
    addEventListener() {},
    createElement() {
      return new FakeElement();
    },
  };

  const context = {
    console,
    document,
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, value);
      },
    },
    window: {
      crypto: { randomUUID: () => crypto.randomUUID() },
      setTimeout(callback) {
        callback();
        return 1;
      },
      clearInterval() {},
      setInterval() {
        return 1;
      },
      confirm() {
        return true;
      },
    },
    crypto,
    structuredClone,
    FormData,
    URL,
    Blob,
  };

  context.window.window = context.window;
  context.window.localStorage = context.localStorage;
  context.window.document = document;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("app.js", "utf8"), context, { filename: "app.js" });
  return context;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const context = createContext();
assert(vm.runInContext("state.words.length", context) === 12, "默认词库应包含 12 个词");
assert(vm.runInContext("getValidWords().length", context) === 12, "默认词库应全部有效");

const parsed = vm.runInContext(
  "parseImportText('alpha | 阿尔法 | /a/ | Alpha test.\\nbeta | 贝塔')",
  context,
);
assert(parsed.words.length === 2, "导入解析应支持竖线格式");
assert(parsed.words[0].example === "Alpha test.", "导入解析应保留例句");

const recognizedText = vm.runInContext(
  "formatOcrText('abandon 放 弃 ； 抛 弃 benefit 益 处 ； 使 受 益')",
  context,
);
assert(
  recognizedText === "abandon | 放弃；抛弃\nbenefit | 益处；使受益",
  "OCR 文本应整理成两条导入记录",
);

const pairedText = vm.runInContext(
  "formatOcrText('abandon\\n放弃；抛弃\\nbenefit\\n益处；使受益')",
  context,
);
assert(
  pairedText === "abandon | 放弃；抛弃\nbenefit | 益处；使受益",
  "分行的 OCR 文本应自动配对",
);

vm.runInContext(
  "state.settings.mode='mixed'; state.settings.count='10'; state.settings.optionCount=4; startSession();",
  context,
);
assert(vm.runInContext("session.questions.length", context) === 10, "每轮应生成 10 道题");
assert(
  vm.runInContext(
    "session.questions.every(q => q.type === 'spelling' || q.options.some(option => option.value === q.target))",
    context,
  ),
  "选择题选项必须包含正确答案",
);
assert(
  vm.runInContext(
    "session.questions.every(q => q.type === 'spelling' || q.options.every(option => option.value && option.match))",
    context,
  ),
  "每个选择题选项都应带有对应的翻译",
);

vm.runInContext(
  `
    while (!session.finished) {
      const question = session.questions[session.currentIndex];
      if (question.type === "spelling") {
        submitAnswer(true, question.word.en, question.word.en);
      } else {
        submitAnswer(true, question.target, question.target);
      }
      nextQuestion();
    }
  `,
  context,
);
assert(vm.runInContext("session.correct", context) === 10, "全部答对时正确数应为 10");
assert(vm.runInContext("elements.resultView.hidden", context) === false, "完成后应显示结果页");

vm.runInContext("state.words=[]; saveState();", context);
assert(vm.runInContext("loadState().words.length", context) === 0, "清空词库后刷新不应恢复示例词");

console.log("smoke-test: passed");
