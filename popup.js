(() => {
  "use strict";

  const DESIGN_KEY = "ubg_design_v1";

 const CATEGORY_ICON_OPTIONS = [
  ["시작", "start"],
  ["흐름", "flow"],
  ["움직임", "moving"],
  ["생김새", "looks"],
  ["붓", "brush"],
  ["소리", "sound"],
  ["판단", "judgement"],
  ["계산", "calc"],
  ["자료", "variable"],
  ["함수", "func"],
  ["데이터분석", "analysis"],
  ["인공지능", "ai_utilize"],
  ["확장", "expansion"],
  ["하드웨어", "hardware"],

  // 교과형에서 사용하는 숨은 카테고리
  ["센서", "sensor"],
  ["스피커", "speaker"],
  ["모터", "motor"],
  ["LED", "led"]
];

  const CATEGORY_ICON_CODES = new Set(
    CATEGORY_ICON_OPTIONS.map(([, code]) => code)
  );

  const INDICATOR_OPTIONS = [
    ["시작", "start_icon.svg"],
    ["시작 - 재생", "start_icon_play.svg"],
    ["시작 - 복제", "start_icon_clone.svg"],
    ["시작 - 키보드", "start_icon_keyboard.svg"],
    ["시작 - 마우스", "start_icon_mouse.svg"],
    ["시작 - 신호", "start_icon_signal.svg"],
    ["시작 - 장면", "start_icon_scene.svg"],
    ["시작 - 얼굴", "start_icon_face.svg"],
    ["시작 - 손", "start_icon_hand.svg"],
    ["시작 - 포즈", "start_icon_pose.svg"],
    ["시작 - 사물", "start_icon_object.svg"],

    ["AI - 얼굴", "ai_face_icon.svg"],
    ["AI - 손", "ai_hand_icon.svg"],
    ["AI - 사물", "ai_object_icon.svg"],
    ["AI - 포즈", "ai_pose_icon.svg"],
    ["AI - 영상", "ai_video_icon.svg"],
    ["AI", "ai_utilize_icon.svg"],

    ["흐름", "flow_icon.svg"],
    ["움직임", "moving_icon.svg"],
    ["생김새", "looks_icon.svg"],
    ["붓", "brush_icon.svg"],
    ["소리", "sound_icon.svg"],
    ["계산", "calc_icon.svg"],
    ["자료", "variable_icon.svg"],
    ["함수", "func_icon.svg"],
    ["데이터분석", "block_analysis.svg"],

    ["하드웨어", "hardware_icon.svg"],
    ["하드웨어 Lite", "hardwarelite_icon.svg"],
    ["하드웨어 - LED", "hardware_led.svg"],
    ["하드웨어 - DC", "hardware_dc.svg"],
    ["하드웨어 - 부저", "hardware_bzr2.svg"],
    ["시작 - 하드웨어", "start_icon_hardware.svg"],
    ["시작 - 하드웨어 Lite", "start_icon_hardwarelite.svg"],

    // 교과형 전용 인디케이터
    ["교과형 - 서보", "practical_course/servo.png"],
    ["교과형 - DC 모터", "practical_course/dcmotor.png"],
    ["교과형 - LED", "practical_course/diode.png"],
    ["교과형 - 멜로디", "practical_course/melody.png"],
    ["교과형 - 소리", "practical_course/sound.png"],
    ["교과형 - 빛", "practical_course/light.png"]
  ];

  const INDICATOR_NAME_TO_FILE = Object.fromEntries(INDICATOR_OPTIONS);

  const LEGACY_ICON_CODE_TO_FILE = {
    start: "start_icon.svg",
    flow: "flow_icon.svg",
    moving: "moving_icon.svg",
    looks: "looks_icon.svg",
    brush: "brush_icon.svg",
    sound: "sound_icon.svg",
    judgement: "judgement_icon.svg",
    calc: "calc_icon.svg",
    variable: "variable_icon.svg",
    func: "func_icon.svg",
    analysis: "block_analysis.svg",
    ai_utilize: "ai_utilize_icon.svg",
    expansion: "expansion_icon.svg",
    hardware: "hardware_icon.svg"
  };

  function normalizeCategoryIcon(value) {
    const raw = String(value || "").trim();
    if (!raw) return "flow";

    if (CATEGORY_ICON_CODES.has(raw)) {
      return raw;
    }

    if (raw === "block_analysis.svg" || raw === "analysis_icon.svg") {
      return "analysis";
    }

    if (raw.endsWith("_icon.svg")) {
      const code = raw.slice(0, -"_icon.svg".length);
      if (CATEGORY_ICON_CODES.has(code)) {
        return code;
      }
    }

    if (raw.endsWith(".svg")) {
      const code = raw.slice(0, -4);
      if (CATEGORY_ICON_CODES.has(code)) {
        return code;
      }
    }

    return "flow";
  }

  const categoriesList = document.getElementById("categoriesList");
  const addCategoryBtn = document.getElementById("addCategoryBtn");
  const registerBtn = document.getElementById("registerBtn");
  const copyDistBtn = document.getElementById("copyDistBtn");
  const statusBox = document.getElementById("status");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalTitle = document.getElementById("modalTitle");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const saveEditBtn = document.getElementById("saveEditBtn");
  const addPartBtn = document.getElementById("addPartBtn");
  const partsEditor = document.getElementById("partsEditor");
  const colorR = document.getElementById("colorR");
  const colorG = document.getElementById("colorG");
  const colorB = document.getElementById("colorB");
  const colorA = document.getElementById("colorA");
  const borderR = document.getElementById("borderR");
  const borderG = document.getElementById("borderG");
  const borderB = document.getElementById("borderB");
  const borderA = document.getElementById("borderA");
  const blockShape = document.getElementById("blockShape");

  let design = createDefaultDesign();
  let editingCategoryIndex = -1;
  let editingBlockIndex = -1;
  let editingBlock = null;
  let registerPending = false;

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function clampRgb(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(255, Math.round(number)));
  }

  function createDefaultPart(type = "label") {
    if (type === "label") {
  return {
    type,
    text: "새 블록",
    color: { r: 255, g: 255, b: 255, a: 255 }
  };
}
    if (type === "value") return { type, defaultValue: "10" };
    if (type === "boolean") {
      return { type, trueText: "참", falseText: "거짓", defaultValue: "true" };
    }
    if (type === "textInput") {
  return {
    type,
    value: "여기에 입력하세요",
    size: 12,
    color: { r: 255, g: 255, b: 255, a: 255 }
  };
}
    if (type === "indicator") {
  return {
    type,
    size: 11,
    indicatorFile: "flow_icon.svg"
  };
}
    if (type === "linebreak") return { type };
    if (type === "dropdown") {
      return {
        type,
        options: [
          { label: "항목 1", value: "1" },
          { label: "항목 2", value: "2" }
        ],
        defaultValue: "1"
      };
    }
    return { type: "label", text: "새 블록" };
  }

function createDefaultBlock(index) {
  return {
    id: uid("block"),
    skeleton: "basic",
    color: { r: 79, g: 99, b: 255, a: 255 },
    border: { r: 52, g: 70, b: 210, a: 255 },
    parts: [
        { type: "label", text: `블록 ${index + 1}`, color: { r: 255, g: 255, b: 255, a: 255 } },
        { type: "indicator", size: 11, indicatorFile: "flow_icon.svg" }
      ]
    };
  }

  function createDefaultCategory(index) {
  return {
    id: uid("ubg_category"),
    name: index === 0 ? "" : `카테고리 ${index + 1}`,
    icon: "flow",
    blocks: [createDefaultBlock(0)]
  };
}

  function createDefaultDesign() {
    return {
      version: 2,
      categories: [createDefaultCategory(0)]
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeIndicatorPart(part) {
    if (!part || part.type !== "indicator") return part;

    if (part.indicatorFile) return part;

    if (part.img) {
      const match = String(part.img).match(/block_icon\/(.+\.(?:svg|png))$/i);
      if (match?.[1]) {
        part.indicatorFile = match[1];
      }
    }

    if (!part.indicatorFile && part.categoryName) {
      part.indicatorFile = INDICATOR_NAME_TO_FILE[String(part.categoryName).trim()] || "";
    }

    if (!part.indicatorFile && part.category) {
      part.indicatorFile =
        LEGACY_ICON_CODE_TO_FILE[String(part.category).trim()] || "";
    }

    if (!part.indicatorFile) {
      part.indicatorFile = "flow_icon.svg";
    }

    delete part.category;
    delete part.categoryName;
    delete part.img;
    return part;
  }

  function normalizeBlock(block, index) {
    if (!block || typeof block !== "object") block = createDefaultBlock(index);
    if (!block.id) block.id = uid("block");
    if (!block.skeleton) block.skeleton = "basic";
    if (!Array.isArray(block.parts) || !block.parts.length) {
      block.parts = [createDefaultPart("label")];
    }
    block.parts.forEach(normalizeIndicatorPart);
    return block;
  }

  function normalizeDesign(value) {
    if (!value || typeof value !== "object") return createDefaultDesign();

    // v0.1.0/0.1.1 단일 카테고리 데이터 자동 변환
    if (!Array.isArray(value.categories) && Array.isArray(value.blocks)) {
      value = {
        version: 2,
        categories: [
          {
            id: value.categoryId || uid("ubg_category"),
            name: value.categoryName || "",
            blocks: value.blocks
          }
        ]
      };
    }

    if (!Array.isArray(value.categories) || !value.categories.length) {
      return createDefaultDesign();
    }

    value.version = 2;

    value.categories = value.categories.map((category, categoryIndex) => {
      const normalized = category && typeof category === "object"
        ? category
        : createDefaultCategory(categoryIndex);

      if (!normalized.id) normalized.id = uid("ubg_category");
      normalized.name = String(normalized.name ?? normalized.categoryName ?? "");
      normalized.icon = normalizeCategoryIcon(normalized.icon);
      if (!Array.isArray(normalized.blocks) || !normalized.blocks.length) {
        normalized.blocks = [createDefaultBlock(0)];
      }
      normalized.blocks = normalized.blocks.map(normalizeBlock);
      return normalized;
    });

    return value;
  }

  function saveDesign() {
    chrome.storage.local.set({ [DESIGN_KEY]: design });
  }

  function loadDesign() {
    chrome.storage.local.get([DESIGN_KEY], (result) => {
      design = normalizeDesign(result[DESIGN_KEY]);
      saveDesign();
      renderCategories();
    });
  }

  function describeBlock(block) {
  const shapeNames = {
    basic: "기본 블록",
    basic_string_field: "값 블록",
    basic_boolean_field: "판단 블록",
    basic_without_next: "끝 블록",
    basic_loop: "if 블록",
    basic_double_loop: "if else 블록",
    basic_event: "시작 블록"
  };

  const partNames = {
    label: "이름",
    value: "값",
    boolean: "boolean",
    textInput: "텍스트",
    indicator: "인디케이터",
    dropdown: "드롭다운",
    linebreak: "줄바꿈"
  };

  const shape =
    shapeNames[block.skeleton || "basic"] ||
    block.skeleton ||
    "기본 블록";

  const parts = (block.parts || [])
    .map((part) => partNames[part.type] || part.type)
    .join(" · ");

  return parts
    ? `${shape} · ${parts}`
    : shape;
}
  function hasBlocks() {
  return design.categories.some(
    (category) =>
      Array.isArray(category.blocks) &&
      category.blocks.length > 0
  );
}

function updateCopyDistButton() {
  copyDistBtn.style.display =
    hasBlocks() ? "block" : "none";
}

  function renderCategories() {
    categoriesList.innerHTML = "";

    design.categories.forEach((category, categoryIndex) => {
      const card = document.createElement("div");
      card.className = "category-card";

      const head = document.createElement("div");
      head.className = "category-head";

      const title = document.createElement("div");
      title.className = "category-title";
      title.textContent = `카테고리 ${categoryIndex + 1}`;

      const removeCategoryBtn = document.createElement("button");
      removeCategoryBtn.className = "danger";
      removeCategoryBtn.textContent = "카테고리 삭제";
      removeCategoryBtn.disabled = design.categories.length <= 1;
      removeCategoryBtn.addEventListener("click", () => {
        if (design.categories.length <= 1) return;
        design.categories.splice(categoryIndex, 1);
        saveDesign();
        renderCategories();
      });

      head.append(title, removeCategoryBtn);
      card.appendChild(head);

      const nameWrap = document.createElement("div");
      nameWrap.className = "category-name-wrap";
      const nameLabel = document.createElement("label");
      nameLabel.textContent = "카테고리 이름 설정하기";
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.placeholder = "예: 테스트 블록";
      nameInput.value = category.name || "";
      nameInput.addEventListener("input", () => {
        design.categories[categoryIndex].name = nameInput.value;
        saveDesign();
      });
      nameLabel.appendChild(nameInput);
      nameWrap.appendChild(nameLabel);
      card.appendChild(nameWrap);
      const iconLabel = document.createElement("label");
iconLabel.textContent = "카테고리 아이콘";

const iconSelect = document.createElement("select");

for (const [name, code] of CATEGORY_ICON_OPTIONS) {
  const option = document.createElement("option");
  option.value = code;
  option.textContent = name;
  iconSelect.appendChild(option);
}

iconSelect.value = normalizeCategoryIcon(category.icon);
if (![...iconSelect.options].some((option) => option.value === iconSelect.value)) {
  iconSelect.value = "flow";
}

iconSelect.addEventListener("change", () => {
  design.categories[categoryIndex].icon = iconSelect.value;
  saveDesign();
});

iconLabel.appendChild(iconSelect);
nameWrap.appendChild(iconLabel);

      const blocksTitle = document.createElement("h2");
      blocksTitle.textContent = "블록 만들기";
      blocksTitle.style.marginBottom = "8px";
      card.appendChild(blocksTitle);

      const blocksList = document.createElement("div");
      blocksList.className = "blocks-list";

      category.blocks.forEach((block, blockIndex) => {
        const row = document.createElement("div");
        row.className = "block-row";

        const editButton = document.createElement("button");
        editButton.className = "block-edit-btn";

        const blockTitle = document.createElement("strong");
        blockTitle.textContent = `블록 ${blockIndex + 1} 만들기`;

        const summary = document.createElement("span");
        summary.textContent = describeBlock(block) || "아직 구성 없음";

        editButton.append(blockTitle, summary);
        editButton.addEventListener("click", () => {
          openEditor(categoryIndex, blockIndex);
        });

        const removeBlockBtn = document.createElement("button");
        removeBlockBtn.className = "danger";
        removeBlockBtn.textContent = "삭제";
        removeBlockBtn.disabled = category.blocks.length <= 1;
        removeBlockBtn.addEventListener("click", () => {
          if (design.categories[categoryIndex].blocks.length <= 1) return;
          design.categories[categoryIndex].blocks.splice(blockIndex, 1);
          saveDesign();
          renderCategories();
        });

        row.append(editButton, removeBlockBtn);
        blocksList.appendChild(row);
      });

      card.appendChild(blocksList);

      const addBlockBtn = document.createElement("button");
      addBlockBtn.className = "add-block-btn";
      addBlockBtn.textContent = "+";
      addBlockBtn.title = "블록 추가";
      addBlockBtn.addEventListener("click", () => {
        const blocks = design.categories[categoryIndex].blocks;
        blocks.push(createDefaultBlock(blocks.length));
        saveDesign();
        renderCategories();
      });

      card.appendChild(addBlockBtn);
      categoriesList.appendChild(card);
    });
    updateCopyDistButton();
  }

  function openEditor(categoryIndex, blockIndex) {
    editingCategoryIndex = categoryIndex;
    editingBlockIndex = blockIndex;
    editingBlock = clone(design.categories[categoryIndex].blocks[blockIndex]);

    modalTitle.textContent = `카테고리 ${categoryIndex + 1} · 블록 ${blockIndex + 1} 만들기`;

    colorR.value = editingBlock.color?.r ?? 79;
    colorG.value = editingBlock.color?.g ?? 99;
    colorB.value = editingBlock.color?.b ?? 255;
    colorA.value = editingBlock.color?.a ?? 255;
    borderR.value = editingBlock.border?.r ?? 52;
    borderG.value = editingBlock.border?.g ?? 70;
    borderB.value = editingBlock.border?.b ?? 210;
    borderA.value = editingBlock.border?.a ?? 255;
    blockShape.value = editingBlock.skeleton || "basic";

    if (!Array.isArray(editingBlock.parts) || !editingBlock.parts.length) {
      editingBlock.parts = [createDefaultPart("label")];
    }

    editingBlock.parts.forEach(normalizeIndicatorPart);
    renderPartsEditor();
    modalBackdrop.classList.add("open");
  }

  function closeEditor() {
    modalBackdrop.classList.remove("open");
    editingCategoryIndex = -1;
    editingBlockIndex = -1;
    editingBlock = null;
  }

  function typeSelect(part, index) {
    const select = document.createElement("select");
    const types = [
  ["일반 이름", "label"],
  ["값 블록", "value"],
  ["boolean", "boolean"],
  ["텍스트 인풋", "textInput"],
  ["인디케이터", "indicator"],
  ["드롭다운", "dropdown"],
  ["줄바꿈", "linebreak"]
];

    for (const [label, value] of types) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    }

    select.value = part.type;
    select.addEventListener("change", () => {
      editingBlock.parts[index] = createDefaultPart(select.value);
      renderPartsEditor();
    });
    return select;
  }

  function makeField(labelText, input) {
    const label = document.createElement("label");
    label.append(document.createTextNode(labelText), input);
    return label;
  }

  function makeInput(value, onInput, type = "text") {
    const input = document.createElement("input");
    input.type = type;
    input.value = value ?? "";
    input.addEventListener("input", () => onInput(input.value));
    return input;
  }
  function makeRgbaEditor(color, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "rgb-grid";

  const current = color || {
    r: 255,
    g: 255,
    b: 255,
    a: 255
  };

  for (const key of ["r", "g", "b", "a"]) {
    const input = document.createElement("input");

    input.type = "number";
    input.min = "0";
    input.max = "255";
    input.value = current[key] ?? 255;

    input.addEventListener("input", () => {
      current[key] = clampRgb(input.value);

      onChange({
        r: current.r,
        g: current.g,
        b: current.b,
        a: current.a
      });
    });

    const label = document.createElement("label");
    label.textContent = key.toUpperCase();
    label.appendChild(input);

    wrap.appendChild(label);
  }

  return wrap;
}

  function renderPartProperties(container, part, index) {
    if (part.type === "label") {
  container.appendChild(
    makeField(
      "표시할 이름",
      makeInput(part.text, (value) => {
        editingBlock.parts[index].text = value;
      })
    )
  );

  const colorTitle = document.createElement("div");
  colorTitle.className = "hint";
  colorTitle.textContent = "글씨 색 (RGBA)";
  container.appendChild(colorTitle);

  container.appendChild(
    makeRgbaEditor(
      part.color,
      (color) => {
        editingBlock.parts[index].color = color;
      }
    )
  );

  return;
}

    if (part.type === "value") {
      container.appendChild(
        makeField("기본값", makeInput(part.defaultValue, (value) => {
          editingBlock.parts[index].defaultValue = value;
        }))
      );
      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = "문자/숫자 값을 끼울 수 있는 값 블록 슬롯으로 생성됩니다.";
      container.appendChild(hint);
      return;
    }

    if (part.type === "boolean") {
      const preview = document.createElement("div");
      preview.className = "boolean-preview";
      preview.innerHTML = '<div class="boolean-chip">참</div><div class="boolean-chip">거짓</div>';
      container.appendChild(preview);

      container.appendChild(
        makeField("참 표시 이름", makeInput(part.trueText, (value) => {
          editingBlock.parts[index].trueText = value;
        }))
      );
      container.appendChild(
        makeField("거짓 표시 이름", makeInput(part.falseText, (value) => {
          editingBlock.parts[index].falseText = value;
        }))
      );

      const defaultSelect = document.createElement("select");
      defaultSelect.innerHTML = '<option value="true">참</option><option value="false">거짓</option>';
      defaultSelect.value = String(part.defaultValue ?? "true");
      defaultSelect.addEventListener("change", () => {
        editingBlock.parts[index].defaultValue = defaultSelect.value;
      });
      container.appendChild(makeField("기본 선택", defaultSelect));
      return;
    }

    if (part.type === "textInput") {
      container.appendChild(
        makeField("기본 텍스트", makeInput(part.value, (value) => {
          editingBlock.parts[index].value = value;
        }))
      );
      const size = makeInput(part.size ?? 12, (value) => {
        editingBlock.parts[index].size = Math.max(8, Math.min(24, Number(value) || 12));
      }, "number");
      size.min = "8";
      size.max = "24";
      container.appendChild(makeField("글자 크기", size));

const colorTitle = document.createElement("div");
colorTitle.className = "hint";
colorTitle.textContent = "글씨 색 (RGBA)";
container.appendChild(colorTitle);

container.appendChild(
  makeRgbaEditor(
    part.color,
    (color) => {
      editingBlock.parts[index].color = color;
    }
  )
);

return;
    }

    if (part.type === "indicator") {
      const size = makeInput(part.size ?? 11, (value) => {
        editingBlock.parts[index].size = Math.max(8, Math.min(24, Number(value) || 11));
      }, "number");
      size.min = "8";
      size.max = "24";
      container.appendChild(makeField("크기", size));

      const indicatorSelect =
  document.createElement("select");

for (const [name, file] of INDICATOR_OPTIONS) {
  const option =
    document.createElement("option");

  option.value = file;
  option.textContent = name;

  indicatorSelect.appendChild(option);
}

indicatorSelect.value =
  part.indicatorFile || "flow_icon.svg";

if (
  ![...indicatorSelect.options].some(
    (option) =>
      option.value === indicatorSelect.value
  )
) {
  indicatorSelect.value = "flow_icon.svg";
}

indicatorSelect.addEventListener(
  "change",
  () => {
    editingBlock.parts[index].indicatorFile =
      indicatorSelect.value;
  }
);

container.appendChild(
  makeField("인디케이터 종류", indicatorSelect)
);

      return;
    }

    if (part.type === "dropdown") {
      const optionList = document.createElement("div");
      optionList.className = "option-list";

      if (!Array.isArray(part.options) || !part.options.length) {
        part.options = [{ label: "항목 1", value: "1" }];
      }

      part.options.forEach((option, optionIndex) => {
        const row = document.createElement("div");
        row.className = "option-row";

        const labelInput = makeInput(option.label, (value) => {
          editingBlock.parts[index].options[optionIndex].label = value;
        });
        labelInput.placeholder = "표시 이름";

        const valueInput = makeInput(option.value, (value) => {
          editingBlock.parts[index].options[optionIndex].value = value;
        });
        valueInput.placeholder = "실제 값";

        const remove = document.createElement("button");
        remove.className = "small-btn danger";
        remove.textContent = "×";
        remove.disabled = part.options.length <= 1;
        remove.addEventListener("click", () => {
          if (editingBlock.parts[index].options.length <= 1) return;
          editingBlock.parts[index].options.splice(optionIndex, 1);
          const current = editingBlock.parts[index];
          if (!current.options.some((item) => String(item.value) === String(current.defaultValue))) {
            current.defaultValue = current.options[0]?.value ?? "";
          }
          renderPartsEditor();
        });

        row.append(labelInput, valueInput, remove);
        optionList.appendChild(row);
      });

      container.appendChild(optionList);

      const addOption = document.createElement("button");
      addOption.textContent = "+ 항목 추가";
      addOption.addEventListener("click", () => {
        const current = editingBlock.parts[index];
        const n = current.options.length + 1;
        current.options.push({ label: `항목 ${n}`, value: String(n) });
        renderPartsEditor();
      });
      container.appendChild(addOption);

      const defaultSelect = document.createElement("select");
      for (const option of editingBlock.parts[index].options) {
        const item = document.createElement("option");
        item.value = option.value;
        item.textContent = `${option.label} (${option.value})`;
        defaultSelect.appendChild(item);
      }
      defaultSelect.value = String(part.defaultValue ?? part.options[0]?.value ?? "");
      defaultSelect.addEventListener("change", () => {
        editingBlock.parts[index].defaultValue = defaultSelect.value;
      });
      container.appendChild(makeField("기본 항목", defaultSelect));
    }
  }

  function renderPartsEditor() {
    partsEditor.innerHTML = "";

    editingBlock.parts.forEach((part, index) => {
      const card = document.createElement("div");
      card.className = "part-card";

      const head = document.createElement("div");
      head.className = "part-head";
      head.appendChild(typeSelect(part, index));

      const remove = document.createElement("button");
      remove.className = "icon-btn danger";
      remove.textContent = "×";
      remove.disabled = editingBlock.parts.length <= 1;
      remove.addEventListener("click", () => {
        if (editingBlock.parts.length <= 1) return;
        editingBlock.parts.splice(index, 1);
        renderPartsEditor();
      });
      head.appendChild(remove);

      const props = document.createElement("div");
      props.className = "part-props";
      renderPartProperties(props, part, index);

      card.append(head, props);
      partsEditor.appendChild(card);
    });
  }
function makeDistributionJs() {
  const config = clone(design);
  const configJson = JSON.stringify(config, null, 2);

  return `(() => {
  "use strict";

  const design = ${configJson};

  function clampRgb(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(255, Math.round(number))
    );
  }


  function rgbToHex(rgb) {
    const values = [
      rgb?.r,
      rgb?.g,
      rgb?.b,
      rgb?.a ?? 255
    ].map(clampRgb);

    return "#" + values
      .map((value) =>
        value
          .toString(16)
          .padStart(2, "0")
      )
      .join("");
  }


  function sanitizeId(value) {
    return String(value || "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "item";
  }


  function resolveIndicatorFile(part) {
    const direct = String(part?.indicatorFile || "").trim();
    return direct || "flow_icon.svg";
  }


  function buildPart(
  part,
  paramNumber,
  borderColor
) {

  if (!part) {
    return null;
  }

  if (part.type === "label") {
    return {
      template: "%" + paramNumber,

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
        align: "left"
      },

      def: undefined
    };
  }


    if (part.type === "value") {
      return {
        template: "%" + paramNumber,

        param: {
          type: "Block",
          accept: "string"
        },

        def: {
          type: "text",
          params: [
            String(part.defaultValue ?? "")
          ]
        }
      };
    }


    if (part.type === "boolean") {
      return {
        template: "%" + paramNumber,

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
        template: "%" + paramNumber,

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
          size: Math.max(
            8,
            Math.min(
              24,
              Number(part.size) || 12
            )
          )
        },

        def: undefined
      };
    }


    if (part.type === "indicator") {
      const indicatorFile =
        resolveIndicatorFile(part);

      return {
        template: "%" + paramNumber,

        param: {
          type: "Indicator",
          img:
            "block_icon/" +
            indicatorFile,
          size: Math.max(
            8,
            Math.min(
              24,
              Number(part.size) || 11
            )
          )
        },

        def: null
      };
    }


    if (part.type === "linebreak") {
      return {
        template: "%" + paramNumber,

        param: {
          type: "LineBreak"
        },

        def: undefined
      };
    }


    if (part.type === "dropdown") {
      const options =
        Array.isArray(part.options) &&
        part.options.length

          ? part.options.map(
              (item) => [
                String(item.label ?? ""),
                String(item.value ?? "")
              ]
            )

          : [["항목 1", "1"]];


      const optionValues =
        options.map((item) => item[1]);


      const requested =
        String(
          part.defaultValue ??
          optionValues[0] ??
          ""
        );


      const defaultValue =
        optionValues.includes(requested)
          ? requested
          : optionValues[0];


      return {
        template: "%" + paramNumber,

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


  function compileBlock(
    categoryId,
    block,
    index
  ) {

    const blockColor =
      rgbToHex(
        block.color ||
        {
          r: 79,
          g: 99,
          b: 255,
          a: 255
        }
      );


    const borderColor =
      rgbToHex(
        block.border ||
        {
          r: 52,
          g: 70,
          b: 210,
          a: 255
        }
      );


    const blockId =
      sanitizeId(categoryId) +
      "_" +
      sanitizeId(
        block.id ||
        ("block_" + (index + 1))
      );


    const params = [];
    const defs = [];
    const map = [];
    const templatePieces = [];

    let paramNumber = 1;


    for (const part of block.parts || []) {

      // LineBreak는 IF ELSE 전용
      if (
        part?.type === "linebreak" &&
        block.skeleton !==
          "basic_double_loop"
      ) {
        continue;
      }


      


      const compiled =
        buildPart(
          part,
          paramNumber,
          borderColor
        );


      if (!compiled) {
        continue;
      }


      templatePieces.push(
        compiled.template
      );

      params.push(
        compiled.param
      );


      if (
        compiled.def !== undefined
      ) {
        defs.push(compiled.def);
      }


      map.push(
        "P" + paramNumber
      );

      paramNumber++;
    }


    const paramsKeyMap = {};

    map.forEach(
      (key, index) => {
        paramsKeyMap[key] = index;
      }
    );


    const template =
      templatePieces
        .join(" ")
        .replace(/\\s+/g, " ")
        .trim() ||

      ("블록 " + (index + 1));


    const skeleton =
      block.skeleton || "basic";


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

      paramsKeyMap,

      class: "ubg_generated",

      func: async () => {},

      template
    };


    return {
      id: blockId,
      definition
    };
  }


  if (
    !window.Entry ||
    !Entry.block
  ) {
    console.error(
      "[비공식 블록] Entry를 찾을 수 없습니다."
    );

    return;
  }


  if (!Array.isArray(Entry.staticBlocks)) {
    const blocks =
      window.EntryStatic
        ?.getAllBlocks?.();

    Entry.staticBlocks =
      Array.isArray(blocks)
        ? [...blocks]
        : [];
  }


  const categoryInfos = [];


  for (
    let categoryIndex = 0;
    categoryIndex < design.categories.length;
    categoryIndex++
  ) {

    const category =
      design.categories[categoryIndex];


    const categoryId =
      sanitizeId(
        category.id ||
        (
          "ubg_category_" +
          (categoryIndex + 1)
        )
      );


    const categoryName =
      String(
        category.name ||
        (
          "카테고리 " +
          (categoryIndex + 1)
        )
      );


    const blocks =
      Array.isArray(category.blocks)
        ? category.blocks
        : [];


    // 기존 같은 카테고리 제거
    for (
      let i =
        Entry.staticBlocks.length - 1;
      i >= 0;
      i--
    ) {

      const old =
        Entry.staticBlocks[i];


      if (
        old?.category !== categoryId
      ) {
        continue;
      }


      for (
        const oldBlockId
        of old.blocks || []
      ) {
        delete Entry.block[
          oldBlockId
        ];
      }


      Entry.staticBlocks.splice(
        i,
        1
      );
    }


    const compiledBlocks =
      blocks.map(
        (block, index) =>
          compileBlock(
            categoryId,
            block,
            index
          )
      );


    const blockIds =
      compiledBlocks.map(
        (item) => item.id
      );


    for (
      const item
      of compiledBlocks
    ) {

      Entry.block[item.id] =
        item.definition;


      // IF
      if (
        item.definition.skeleton ===
        "basic_loop"
      ) {

        Entry.block[item.id].class =
          "condition";


        Entry.block[item.id].statements =
          [
            {
              accept: "basic"
            }
          ];


        Entry.block[
          item.id
        ].statementsKeyMap = {
          STACK: 0
        };
      }


      // IF ELSE
      if (
        item.definition.skeleton ===
        "basic_double_loop"
      ) {

        Entry.block[item.id].class =
          "condition";


        Entry.block[
          item.id
        ].statements = [
          {
            accept: "basic"
          },
          {
            accept: "basic"
          }
        ];


        Entry.block[
          item.id
        ].statementsKeyMap = {
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


    const firstBlock =
      blocks[0] || {};


    categoryInfos.push({
      id: categoryId,
      name: categoryName,
      icon: category.icon || "flow",

      blockColor:
        rgbToHex(
          firstBlock.color ||
          {
            r: 79,
            g: 99,
            b: 255,
            a: 255
          }
        )
    });
  }


  const blockMenu =
    Entry.playground
      ?.mainWorkspace
      ?.blockMenu ||

    Entry.playground
      ?.blockMenu;


  if (!blockMenu) {
    console.error(
      "[비공식 블록] 블록 메뉴를 찾을 수 없습니다."
    );

    return;
  }


  if (
    typeof blockMenu.setCategoryData ===
    "function"
  ) {

    blockMenu.setCategoryData(
      Entry.staticBlocks
    );
  }


  for (
    const info
    of categoryInfos
  ) {

    const element =
      document.getElementById(
        "entryCategory" + info.id
      );


    if (element) {
  element.textContent = info.name;

 element.style.backgroundImage =
  "url(/lib/entry-js/images/" +
  info.icon +
  ".svg)";

  element.style.backgroundRepeat =
    "no-repeat";
}
  }


  console.log(
    "[비공식 블록] 등록 완료"
  );

})();
`;
}
  function validateDesign() {
    if (!design.categories.length) return "카테고리를 하나 이상 만들어 주세요.";

    for (let categoryIndex = 0; categoryIndex < design.categories.length; categoryIndex++) {
      const category = design.categories[categoryIndex];
      if (!String(category.name || "").trim()) {
        return `카테고리 ${categoryIndex + 1}의 이름을 입력해 주세요.`;
      }
      if (!Array.isArray(category.blocks) || !category.blocks.length) {
        return `카테고리 ${categoryIndex + 1}에 블록을 하나 이상 만들어 주세요.`;
      }
      for (let blockIndex = 0; blockIndex < category.blocks.length; blockIndex++) {
        if (!category.blocks[blockIndex].parts?.length) {
          return `카테고리 ${categoryIndex + 1} · 블록 ${blockIndex + 1}의 구성을 만들어 주세요.`;
        }
      }
    }

    return null;
  }

  function sendRegisterRequest() {
    if (registerPending) return;

    const error = validateDesign();
    if (error) {
      statusBox.textContent = error;
      return;
    }

    registerPending = true;
    registerBtn.disabled = true;
    saveDesign();
    statusBox.textContent = `${design.categories.length}개 카테고리를 현재 엔트리 작품에 등록 중...`;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id || !tab.url?.startsWith("https://playentry.org/ws/")) {
        statusBox.textContent = "엔트리 작품 만들기 페이지에서 사용해 주세요.";
        registerPending = false;
        registerBtn.disabled = false;
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        { type: "UBG_REGISTER_CATEGORY", config: design },
        (response) => {
          registerPending = false;
          registerBtn.disabled = false;

          if (chrome.runtime.lastError) {
            statusBox.textContent = "엔트리 페이지를 한 번 새로고침한 뒤 다시 눌러 주세요.";
            return;
          }

          statusBox.textContent = response?.success
            ? `${design.categories.length}개 카테고리 등록 완료. 다시 적용해도 중복되지 않습니다.`
            : (response?.message || "등록 요청에 실패했습니다.");
        }
      );
    });
  }

  addCategoryBtn.addEventListener("click", () => {
    design.categories.push(createDefaultCategory(design.categories.length));
    saveDesign();
    renderCategories();
  });

  addPartBtn.addEventListener("click", () => {
    if (!editingBlock) return;
    editingBlock.parts.push(createDefaultPart("label"));
    renderPartsEditor();
  });

  closeModalBtn.addEventListener("click", closeEditor);
  cancelEditBtn.addEventListener("click", closeEditor);

  saveEditBtn.addEventListener("click", () => {
    if (
      editingCategoryIndex < 0 ||
      editingBlockIndex < 0 ||
      !editingBlock
    ) {
      return;
    }

    editingBlock.color = {
      r: clampRgb(colorR.value),
      g: clampRgb(colorG.value),
      b: clampRgb(colorB.value),
      a: clampRgb(colorA.value)
    };

    editingBlock.border = {
      r: clampRgb(borderR.value),
      g: clampRgb(borderG.value),
      b: clampRgb(borderB.value),
      a: clampRgb(borderA.value)
    };
editingBlock.skeleton = blockShape.value;
    design.categories[editingCategoryIndex].blocks[editingBlockIndex] = editingBlock;
    saveDesign();
    renderCategories();
    closeEditor();
  });
copyDistBtn.addEventListener(
  "click",
  async () => {

    if (!hasBlocks()) {
      return;
    }

    const code =
      makeDistributionJs();

    try {
      await navigator.clipboard.writeText(
        code
      );

      statusBox.textContent =
        "배포용 JS 코드가 복사되었습니다.";
    } catch (error) {

      const textarea =
        document.createElement("textarea");

      textarea.value = code;

      document.body.appendChild(
        textarea
      );

      textarea.select();

      document.execCommand("copy");

      textarea.remove();

      statusBox.textContent =
        "배포용 JS 코드가 복사되었습니다.";
    }
  }
);
  registerBtn.addEventListener("click", sendRegisterRequest);

  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) closeEditor();
  });

  loadDesign();
})();
