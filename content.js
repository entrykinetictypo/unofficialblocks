(() => {
  "use strict";

  const SOURCE = "UBG_EXTENSION";
  const PATCH_SOURCE = "UBG_PATCH";

  function projectStorageKey() {
    const match = location.pathname.match(/^\/ws\/([a-f0-9]{24}|new)(?:\/|$)/i);
    if (!match) return null;
    return `ubg_registered_${match[1]}`;
  }

  function postConfig(config) {
    if (!config) return;
    window.postMessage(
      {
        source: SOURCE,
        type: "UBG_REGISTER_CATEGORY",
        config
      },
      "*"
    );
  }

  function loadRegisteredConfig() {
    const key = projectStorageKey();
    if (!key) return;

    chrome.storage.local.get([key], (result) => {
      if (result[key]) postConfig(result[key]);
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "UBG_REGISTER_CATEGORY" || !message.config) return;

    const key = projectStorageKey();
    if (!key) {
      sendResponse({ success: false, message: "작품 만들기 페이지가 아닙니다." });
      return;
    }

    chrome.storage.local.set(
      { [key]: message.config },
      () => {
        postConfig(message.config);
        sendResponse({ success: true });
      }
    );

    return true;
  });

  window.addEventListener("message", (event) => {
    if (
      event.source !== window ||
      event.data?.source !== PATCH_SOURCE ||
      event.data?.type !== "UBG_REQUEST_CONFIG"
    ) {
      return;
    }

    loadRegisteredConfig();
  });

  let lastKey = projectStorageKey();

  setInterval(() => {
    const nextKey = projectStorageKey();
    if (!nextKey || nextKey === lastKey) return;

    const oldKey = lastKey;
    lastKey = nextKey;

    if (oldKey === "ubg_registered_new") {
      chrome.storage.local.get([oldKey, nextKey], (result) => {
        if (!result[nextKey] && result[oldKey]) {
          chrome.storage.local.set(
            { [nextKey]: result[oldKey] },
            () => {
              chrome.storage.local.remove([oldKey]);
              postConfig(result[oldKey]);
            }
          );
        } else {
          loadRegisteredConfig();
        }
      });
    } else {
      loadRegisteredConfig();
    }
  }, 500);

  loadRegisteredConfig();
})();
