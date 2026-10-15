(() => {
  "use strict";

  const SOURCE = "UBG_EXTENSION";
  const PATCH_SOURCE = "UBG_PATCH";
  const GENERATED_CATEGORY_PREFIX = "ubg_category_";

  const INDICATOR_NAME_TO_CODE = {
    "시작": "start",
    "흐름": "flow",
    "움직임": "moving",
    "생김새": "looks",
    "붓": "brush",
    "소리": "sound",
    "판단": "judgement",
    "계산": "calc",
    "자료": "variable",
    "함수": "func",
    "데이터분석": "analysis",
    "인공지능": "ai_utilize",
    "확장": "expansion",
    "하드웨어": "hardware"
  };

  let pendingConfig = null;
  let retryTimer = null;

  function clampRgb(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(255, Math.round(number)));
  }

  function rgbToHex(rgb) {

  const values = [
    rgb?.r,
    rgb?.g,
    rgb?.b,
    rgb?.a ?? 255
  ].map(
    clampRgb
  );

  return `#${
    values
      .map(
        value =>
          value
            .toString(16)
            .padStart(2, "0")
      )
      .join("")
  }`;
}
  function sanitizeId(value) {
    return String(value || "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "item";
  }

  function resolveIndicatorCategory(part) {
    const byName = INDICATOR_NAME_TO_CODE[String(part?.categoryName || "").trim()];
    if (byName) return byName;

    // v0.1.1 호환: flow 같은 내부 코드가 저장돼 있던 경우
    const legacyCategory = String(part?.category || "").trim();
    if (/^[a-zA-Z0-9_-]+$/.test(legacyCategory) && legacyCategory) {
      return legacyCategory;
    }

    const legacyMatch = String(part?.img || "").match(
      /block_icon\/([^/]+?)_icon\.svg$/i
    );
    if (legacyMatch?.[1]) return legacyMatch[1];

    return "flow";
  }

  function getBlockMenu() {
    return (
      Entry.playground?.mainWorkspace?.blockMenu ||
      Entry.playground?.blockMenu ||
      null
    );
  }

  function isReady() {
    return Boolean(
      window.Entry &&
      Entry.block &&
      Entry.playground &&
      getBlockMenu()
    );
  }

  function ensureStaticBlocks(blockMenu) {
    if (Array.isArray(Entry.staticBlocks)) return true;

    let baseBlocks = [];

    try {
      const all = window.EntryStatic?.getAllBlocks?.();
      if (Array.isArray(all)) baseBlocks = [...all];
    } catch (_) {}

    if (!baseBlocks.length && Array.isArray(blockMenu?._categoryData)) {
      baseBlocks = [...blockMenu._categoryData];
    }

    if (!baseBlocks.length) return false;

    Entry.staticBlocks = baseBlocks;
    return true;
  }

  function normalizeConfig(config) {
    if (Array.isArray(config?.categories)) return config;

    // v0.1.0/0.1.1 단일 카테고리 설정 호환
    if (config && Array.isArray(config.blocks)) {
      return {
        version: 2,
        categories: [
          {
            id: config.categoryId || "ubg_category_legacy",
            name: config.categoryName || "비공식 블록",
            blocks: config.blocks
          }
        ]
      };
    }

    return { version: 2, categories: [] };
  }

  function buildPart(part, paramNumber, borderColor) {
    if (!part || part.type === "label") return null;

    if (part.type === "value") {
      return {
        template: `%${paramNumber}`,
        param: { type: "Block", accept: "string" },
        def: {
          type: "text",
          params: [String(part.defaultValue ?? "")]
        }
      };
    }

    if (part.type === "boolean") {
      const trueText = String(part.trueText || "참");
      const falseText = String(part.falseText || "거짓");
      const defaultValue = String(part.defaultValue) === "false" ? "false" : "true";

      return {
        template: `%${paramNumber}`,
        param: {
          type: "Dropdown",
          options: [
            [trueText, "true"],
            [falseText, "false"]
          ],
          fontSize: 11,
          arrowColor: borderColor,
          value: defaultValue
        },
        def: defaultValue
      };
    }

    if (part.type === "textInput") {
      return {
        template: `%${paramNumber}`,
        param: {
          type: "TextInput",
          value: String(part.value ?? ""),
          clearBG: true,
          color: "#ffffffff",
          size: Math.max(8, Math.min(24, Number(part.size) || 12))
        },
        def: undefined
      };
    }

    if (part.type === "indicator") {
      const indicatorCategory = resolveIndicatorCategory(part);

      return {
        template: `%${paramNumber}`,
        param: {
          type: "Indicator",
          img: `block_icon/${indicatorCategory}_icon.svg`,
          size: Math.max(8, Math.min(24, Number(part.size) || 11))
        },
        def: undefined
      };
    }

    if (part.type === "dropdown") {
      const options = Array.isArray(part.options) && part.options.length
        ? part.options.map((item) => [String(item.label ?? ""), String(item.value ?? "")])
        : [["항목 1", "1"]];

      const optionValues = options.map((item) => item[1]);
      const requested = String(part.defaultValue ?? optionValues[0] ?? "");
      const defaultValue = optionValues.includes(requested) ? requested : optionValues[0];

      return {
        template: `%${paramNumber}`,
        param: {
          type: "Dropdown",
          options,
          fontSize: 11,
          arrowColor: borderColor,
          value: defaultValue
        },
        def: defaultValue
      };
    }

    return null;
  }

  function compileBlock(categoryId, block, index) {
    const blockColor = rgbToHex(block.color || { r: 79, g: 99, b: 255 });
    const borderColor = rgbToHex(block.border || { r: 52, g: 70, b: 210 });
    const blockId = `${sanitizeId(categoryId)}_${sanitizeId(block.id || `block_${index + 1}`)}`;

    const params = [];
    const defs = [];
    const map = {};
    const templatePieces = [];
    let paramNumber = 1;
    let mapIndex = 0;

    for (const part of block.parts || []) {
      if (part?.type === "label") {
        const text = String(part.text || "").trim();
        if (text) templatePieces.push(text);
        continue;
      }

      const compiled = buildPart(part, paramNumber, borderColor);
      if (!compiled) continue;

      templatePieces.push(compiled.template);
      params.push(compiled.param);
      if (compiled.def !== undefined) defs.push(compiled.def);
      map[`P${mapIndex + 1}`] = mapIndex;
      mapIndex++;
      paramNumber++;
    }

    const template = templatePieces.join(" ").replace(/\s+/g, " ").trim() || `블록 ${index + 1}`;

    return {
      id: blockId,
      definition: {
        color: blockColor,
        outerLine: borderColor,
        fontColor: "#ffffffff",
        skeleton: "basic",
        statement: [],
        params,
        events: {},
        def: {
          params: defs,
          type: blockId
        },
        paramsKeyMap: map,
        class: "ubg_generated",
        func: async () => {},
        template
      }
    };
  }

  function removeCategoryAndBlocks(categoryId) {
    const oldBlockIds = new Set();

    for (let i = Entry.staticBlocks.length - 1; i >= 0; i--) {
      const item = Entry.staticBlocks[i];
      if (item?.category !== categoryId) continue;

      for (const blockId of item.blocks || []) {
        oldBlockIds.add(blockId);
      }
      Entry.staticBlocks.splice(i, 1);
    }

    for (const blockId of oldBlockIds) {
      delete Entry.block[blockId];
    }

    const categoryElement = document.getElementById(`entryCategory${categoryId}`);
    if (categoryElement) categoryElement.remove();

    const style = document.getElementById(`ubg-style-${sanitizeId(categoryId)}`);
    if (style) style.remove();
  }

  function applyCategoryStyles(categoryInfos) {
    for (const info of categoryInfos) {
      const styleId = `ubg-style-${sanitizeId(info.id)}`;
      let style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        document.head.appendChild(style);
      }

      style.textContent = `
#entryCategory${info.id} {
  background-image: url(/lib/entry-js/images/flow.svg);
  background-repeat: no-repeat;
  margin-bottom: 1px;
}
.entrySelectedCategory#entryCategory${info.id} {
  background-image: url(/lib/entry-js/images/flow_on.svg);
  background-color: ${info.blockColor};
  border-color: ${info.borderColor};
  color: #fff;
}
`;

      const categoryElement = document.getElementById(`entryCategory${info.id}`);
      if (categoryElement) {
        categoryElement.textContent = info.name;
      }
    }
  }

  function refreshCategoryView(blockMenu, categoryInfos) {
    const categories = [];
    const seen = new Set();

    for (const item of Entry.staticBlocks) {
      if (!item?.category || seen.has(item.category)) continue;
      seen.add(item.category);
      categories.push({
        category: item.category,
        visible: item.category !== "arduino"
      });
    }

    blockMenu._generateCategoryView(categories);

    document
      .querySelectorAll(".entryCategoryElementWorkspace")
      .forEach((element) => {
        if (element.id !== "entryCategorytext") {
          element.className = "entryCategoryElementWorkspace";
        }
      });

    blockMenu._categoryData = Entry.staticBlocks;

    for (const info of categoryInfos) {
      blockMenu._generateCategoryCode(info.id);
    }

    applyCategoryStyles(categoryInfos);
  }

  function registerConfig(rawConfig) {
    if (!isReady()) {
      pendingConfig = rawConfig;
      startRetry();
      return false;
    }

    const blockMenu = getBlockMenu();
    if (!ensureStaticBlocks(blockMenu)) {
      pendingConfig = rawConfig;
      startRetry();
      return false;
    }

    const config = normalizeConfig(rawConfig);
    const categories = Array.isArray(config.categories) ? config.categories : [];

    const desiredCategoryIds = new Set(
      categories.map((category) => sanitizeId(category.id || "ubg_category"))
    );

    // 이 생성기가 이전에 만들었지만 현재 설정에서 삭제된 카테고리 제거
    const staleCategoryIds = Entry.staticBlocks
      .map((item) => item?.category)
      .filter((categoryId) =>
        typeof categoryId === "string" &&
        categoryId.startsWith(GENERATED_CATEGORY_PREFIX) &&
        !desiredCategoryIds.has(categoryId)
      );

    for (const staleCategoryId of new Set(staleCategoryIds)) {
      removeCategoryAndBlocks(staleCategoryId);
    }

    const categoryInfos = [];

    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
      const category = categories[categoryIndex] || {};
      const categoryId = sanitizeId(category.id || `ubg_category_${categoryIndex + 1}`);
      const categoryName = String(category.name || category.categoryName || `카테고리 ${categoryIndex + 1}`);
      const blocks = Array.isArray(category.blocks) ? category.blocks : [];

      const previousBlockIds = new Set();

      for (let i = Entry.staticBlocks.length - 1; i >= 0; i--) {
        const item = Entry.staticBlocks[i];
        if (item?.category !== categoryId) continue;

        for (const oldBlockId of item.blocks || []) {
          previousBlockIds.add(oldBlockId);
        }
        Entry.staticBlocks.splice(i, 1);
      }

      const compiledBlocks = blocks.map((block, index) => compileBlock(categoryId, block, index));
      const blockIds = compiledBlocks.map((item) => item.id);

      for (const item of compiledBlocks) {
        Entry.block[item.id] = item.definition;
      }

      for (const oldBlockId of previousBlockIds) {
        if (!blockIds.includes(oldBlockId)) {
          delete Entry.block[oldBlockId];
        }
      }

      Entry.staticBlocks.push({
        category: categoryId,
        visible: true,
        blocks: blockIds
      });

      const firstBlock = blocks[0] || {};
      categoryInfos.push({
        id: categoryId,
        name: categoryName,
        blockColor: rgbToHex(firstBlock.color || { r: 79, g: 99, b: 255 }),
        borderColor: rgbToHex(firstBlock.border || { r: 52, g: 70, b: 210 }),
        blockIds
      });
    }

    refreshCategoryView(blockMenu, categoryInfos);

    console.log("[비공식 블록 생성기] 전체 카테고리 등록 완료", categoryInfos);

    pendingConfig = null;
    return true;
  }

  function startRetry() {
    if (retryTimer) return;

    let count = 0;
    retryTimer = setInterval(() => {
      count++;

      if (pendingConfig && isReady()) {
        const config = pendingConfig;
        if (registerConfig(config)) {
          clearInterval(retryTimer);
          retryTimer = null;
          return;
        }
      }

      if (count >= 300) {
        clearInterval(retryTimer);
        retryTimer = null;
        console.warn("[비공식 블록 생성기] Entry 준비 시간 초과");
      }
    }, 100);
  }

  window.addEventListener("message", (event) => {
    if (
      event.source !== window ||
      event.data?.source !== SOURCE ||
      event.data?.type !== "UBG_REGISTER_CATEGORY" ||
      !event.data.config
    ) {
      return;
    }

    registerConfig(event.data.config);
  });

  window.postMessage(
    {
      source: PATCH_SOURCE,
      type: "UBG_REQUEST_CONFIG"
    },
    "*"
  );
})();
