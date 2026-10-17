(() => {
  "use strict";

  const SOURCE = "UBG_EXTENSION";
  const PATCH_SOURCE = "UBG_PATCH";
  const GENERATED_CATEGORY_PREFIX = "ubg_category_";

  const LEGACY_INDICATOR_NAME_TO_FILE = {
    "시작": "start_icon.svg",
    "흐름": "flow_icon.svg",
    "움직임": "moving_icon.svg",
    "생김새": "looks_icon.svg",
    "붓": "brush_icon.svg",
    "소리": "sound_icon.svg",
    "계산": "calc_icon.svg",
    "자료": "variable_icon.svg",
    "함수": "func_icon.svg",
    "데이터분석": "block_analysis.svg",
    "인공지능": "ai_utilize_icon.svg",
    "하드웨어": "hardware_icon.svg"
  };

  const LEGACY_INDICATOR_CODE_TO_FILE = {
    start: "start_icon.svg",
    flow: "flow_icon.svg",
    moving: "moving_icon.svg",
    looks: "looks_icon.svg",
    brush: "brush_icon.svg",
    sound: "sound_icon.svg",
    calc: "calc_icon.svg",
    variable: "variable_icon.svg",
    func: "func_icon.svg",
    analysis: "block_analysis.svg",
    ai_utilize: "ai_utilize_icon.svg",
    hardware: "hardware_icon.svg"
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

  function resolveIndicatorFile(part) {
    const direct = String(part?.indicatorFile || "").trim();
    if (/^[a-zA-Z0-9_.-]+\.svg$/i.test(direct)) {
      return direct;
    }

    const byName = LEGACY_INDICATOR_NAME_TO_FILE[
      String(part?.categoryName || "").trim()
    ];
    if (byName) return byName;

    // v0.1.1 호환: flow 같은 내부 코드가 저장돼 있던 경우
    const legacyCategory = String(part?.category || "").trim();
    const byCode = LEGACY_INDICATOR_CODE_TO_FILE[legacyCategory];
    if (byCode) return byCode;

    // 예전 img에 block_icon/파일명.svg가 직접 저장돼 있던 경우
    const legacyMatch = String(part?.img || "").match(
      /block_icon\/([^/]+\.svg)$/i
    );
    if (legacyMatch?.[1]) return legacyMatch[1];

    return "flow_icon.svg";
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
    if (!part) return null;
    if (part.type === "label") {
  return {
    template: `%${paramNumber}`,

    param: {
      type: "Text",
      text: String(part.text || ""),
      color: rgbToHex(
        part.color || {
          r: 255,
          g: 255,
          b: 255,
          a: 255
        }
      ),
      align: "center"
    },

    def: undefined
  };
}

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
  return {
    template: `%${paramNumber}`,

    param: {
      type: "Block",
      accept: "boolean"
    },

    def: {
      type: "True"
    }
  };
}

    if (part.type === "textInput") {
      return {
        template: `%${paramNumber}`,
        param: {
          type: "TextInput",
          value: String(part.value ?? ""),
          clearBG: true,
          color: rgbToHex(
  part.color || {
    r: 255,
    g: 255,
    b: 255,
    a: 255
  }
),
          size: Math.max(8, Math.min(24, Number(part.size) || 12))
        },
        def: undefined
      };
    }

    if (part.type === "indicator") {
      const indicatorFile = resolveIndicatorFile(part);

      return {
        template: `%${paramNumber}`,
        param: {
          type: "Indicator",
          img: `block_icon/${indicatorFile}`,
          size: Math.max(8, Math.min(24, Number(part.size) || 11))
        },
        def: null
      };
    }
if (part.type === "linebreak") {
  return {
    template: `%${paramNumber}`,
    param: {
      type: "LineBreak"
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
      if (
  part?.type === "linebreak" &&
  block.skeleton !== "basic_double_loop"
) {
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
const template =
  templatePieces.join(" ").replace(/\s+/g, " ").trim() ||
  `블록 ${index + 1}`;

const skeleton = block.skeleton || "basic";

const definition = {
  color: blockColor,
  outerLine: borderColor,
  fontColor: "#ffffffff",
  skeleton,
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
};





return {
  id: blockId,
  definition
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
  background-image: url(/lib/entry-js/images/block_icon/${info.icon});
  background-repeat: no-repeat;
  margin-bottom: 1px;
}
.entrySelectedCategory#entryCategory${info.id} {
  background-image: url(/lib/entry-js/images/block_icon/${info.icon});
  background-repeat: no-repeat;
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
  blockMenu = getBlockMenu();

  if (!blockMenu) {
    return;
  }

  // 기존 블록 메뉴를 싹 비우고
  // 현재 Entry.staticBlocks 기준으로 처음부터 다시 생성
  blockMenu.setCategoryData(Entry.staticBlocks);

  // 커스텀 카테고리 이름/색상 다시 적용
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

      

for (let i = Entry.staticBlocks.length - 1; i >= 0; i--) {
  const item = Entry.staticBlocks[i];

  if (item?.category !== categoryId) {
    continue;
  }

  for (const oldBlockId of item.blocks || []) {
    
    delete Entry.block[oldBlockId];
  }

  Entry.staticBlocks.splice(i, 1);
}


// 기존 카테고리 버튼 제거
const oldCategoryElement =
  document.getElementById(`entryCategory${categoryId}`);

if (oldCategoryElement) {
  oldCategoryElement.remove();
}


// 기존 스타일 제거
const oldStyle =
  document.getElementById(
    `ubg-style-${sanitizeId(categoryId)}`
  );

if (oldStyle) {
  oldStyle.remove();
}

      const compiledBlocks = blocks.map((block, index) => compileBlock(categoryId, block, index));
      const blockIds = compiledBlocks.map((item) => item.id);

      for (const item of compiledBlocks) {
  Entry.block[item.id] = item.definition;

  // IF
  if (item.definition.skeleton === "basic_loop") {
    Entry.block[item.id].class = "condition";

    Entry.block[item.id].statements = [
      { accept: "basic" }
    ];

    Entry.block[item.id].statementsKeyMap = {
      STACK: 0
    };
  }

  // IF ELSE
  if (item.definition.skeleton === "basic_double_loop") {
    Entry.block[item.id].class = "condition";

    Entry.block[item.id].statements = [
      { accept: "basic" },
      { accept: "basic" }
    ];

    Entry.block[item.id].statementsKeyMap = {
      STACK_IF: 0,
      STACK_ELSE: 1
    };
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
        icon: (() => {
          const rawIcon = String(category.icon || "flow_icon.svg").trim();
          if (/^[a-zA-Z0-9_.-]+\.svg$/i.test(rawIcon)) return rawIcon;
          return LEGACY_INDICATOR_CODE_TO_FILE[rawIcon] || "flow_icon.svg";
        })(),
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
