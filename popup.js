(() => {
  "use strict";

  const DESIGN_KEY = "ubg_design_v1";

  const INDICATOR_CATEGORIES = [
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
    ["하드웨어", "hardware"]
  ];

  const INDICATOR_CODE_TO_NAME = Object.fromEntries(
    INDICATOR_CATEGORIES.map(([name, code]) => [code, name])
  );

  const categoriesList = document.getElementById("categoriesList");
  const addCategoryBtn = document.getElementById("addCategoryBtn");
  const registerBtn = document.getElementById("registerBtn");
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
    if (type === "label") return { type, text: "새 블록" };
    if (type === "value") return { type, defaultValue: "10" };
    if (type === "boolean") {
      return { type, trueText: "참", falseText: "거짓", defaultValue: "true" };
    }
    if (type === "textInput") {
      return { type, value: "여기에 입력하세요", size: 12 };
    }
    if (type === "indicator") {
      return { type, size: 11, categoryName: "흐름" };
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
        { type: "label", text: `블록 ${index + 1}` },
        { type: "indicator", size: 11, categoryName: "흐름" }
      ]
    };
  }

  function createDefaultCategory(index) {
    return {
      id: uid("ubg_category"),
      name: index === 0 ? "" : `카테고리 ${index + 1}`,
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

    if (!part.categoryName) {
      let code = String(part.category || "").trim();
      if (!code && part.img) {
        const match = String(part.img).match(/block_icon\/([^/]+?)_icon\.svg$/i);
        code = match?.[1] || "flow";
      }
      part.categoryName = INDICATOR_CODE_TO_NAME[code] || "흐름";
    }

    delete part.category;
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
    const names = {
      label: "이름",
      value: "값",
      boolean: "boolean",
      textInput: "텍스트",
      indicator: "인디케이터",
      dropdown: "드롭다운"
    };
    return (block.parts || []).map((part) => names[part.type] || part.type).join(" · ");
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

  function renderPartProperties(container, part, index) {
    if (part.type === "label") {
      container.appendChild(
        makeField("표시할 이름", makeInput(part.text, (value) => {
          editingBlock.parts[index].text = value;
        }))
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
      return;
    }

    if (part.type === "indicator") {
      const size = makeInput(part.size ?? 11, (value) => {
        editingBlock.parts[index].size = Math.max(8, Math.min(24, Number(value) || 11));
      }, "number");
      size.min = "8";
      size.max = "24";
      container.appendChild(makeField("크기", size));

      const categorySelect = document.createElement("select");
      for (const [name] of INDICATOR_CATEGORIES) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        categorySelect.appendChild(option);
      }

      categorySelect.value = part.categoryName || "흐름";
      if (![...categorySelect.options].some((option) => option.value === categorySelect.value)) {
        categorySelect.value = "흐름";
      }

      categorySelect.addEventListener("change", () => {
        editingBlock.parts[index].categoryName = categorySelect.value;
      });

      container.appendChild(makeField("카테고리 이름", categorySelect));

      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = "시작, 흐름, 움직임, 생김새, 붓, 소리, 판단, 계산, 자료, 함수, 데이터분석, 인공지능, 확장, 하드웨어 중에서 선택합니다.";
      container.appendChild(hint);
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

  registerBtn.addEventListener("click", sendRegisterRequest);

  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) closeEditor();
  });

  loadDesign();
})();
