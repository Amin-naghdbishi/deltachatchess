// @ts-check
/** @typedef {import('@webxdc/types/global')} */

/** @type {import('@webxdc/types').Webxdc<any>} */
window.webxdc = (() => {
  function h(tag, attributes, ...children) {
    const element = document.createElement(tag);
    if (attributes) {
      Object.entries(attributes).forEach((entry) => {
        element.setAttribute(entry[0], entry[1]);
      });
    }
    element.append(...children);
    return element;
  }

  let appIcon = undefined;
  async function getIcon() {
    if (appIcon) {
      return appIcon;
    }
    const img = new Image();
    try {
      img.src = "icon.png";
      await img.decode();
      appIcon = "icon.png";
    } catch (e) {
      img.src = "icon.jpg";
      try {
        await img.decode();
        appIcon = "icon.jpg";
      } catch (e) {}
    }
    return appIcon;
  }
  getIcon();

  let ephemeralUpdateKey = "__xdcEphemeralUpdateKey__";

  class RealtimeListener {
    constructor() {
      this.listener = null;
      this.trashed = false;
    }

    is_trashed() {
      return this.trashed;
    }

    receive(data) {
      if (this.trashed) {
        throw new Error(
          "realtime listener is trashed and can no longer be used",
        );
      }
      if (this.listener) {
        this.listener(data);
      }
    }

    setListener(listener) {
      this.listener = listener;
    }

    send(data) {
      if (!(data instanceof Uint8Array)) {
        throw new Error("realtime listener data must be a Uint8Array");
      }
      window.localStorage.setItem(
        ephemeralUpdateKey,
        JSON.stringify([window.webxdc.selfAddr, Array.from(data), Date.now()]),
      );
    }

    leave() {
      this.trashed = true;
    }
  }

  let updateListener = (_) => {};
  let realtimeListener = null;
  const updatesKey = "__xdcUpdatesKey__";
  window.addEventListener("storage", (event) => {
    if (event.key == null) {
      window.location.reload();
    } else if (event.key === updatesKey) {
      const updates = JSON.parse(event.newValue);
      const update = updates[updates.length - 1];
      if (update) {
        update.max_serial = updates.length;
        console.log("[Webxdc] " + JSON.stringify(update));
        if (update.notify && update._sender !== window.webxdc.selfAddr) {
          if (update.notify[window.webxdc.selfAddr]) {
            sendNotification(update.notify[window.webxdc.selfAddr]);
          } else if (update.notify["*"]) {
            sendNotification(update.notify["*"]);
          }
        }
        updateListener(update);
      }
    } else if (event.key === ephemeralUpdateKey) {
      const [sender, update] = JSON.parse(event.newValue);
      if (
        window.webxdc.selfAddr !== sender &&
        realtimeListener &&
        !realtimeListener.is_trashed()
      ) {
        realtimeListener.receive(Uint8Array.from(update));
      }
    }
  });

  function getUpdates() {
    const updatesJSON = window.localStorage.getItem(updatesKey);
    return updatesJSON ? JSON.parse(updatesJSON) : [];
  }

  async function sendNotification(text) {
    console.log("[NOTIFICATION] " + text);
    try {
      const opts = { body: text, icon: await getIcon() };
      const title = "To: " + window.webxdc.selfName;
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification(title, opts);
      }
    } catch (e) {}
  }

  function getNextPeerUrl() {
    const loc = window.location;
    const params = new URLSearchParams(loc.hash.substr(1));
    const peerId = Number(params.get("next_peer")) || 1;
    const peerName = "device" + peerId;
    return {
      peerName,
      peerId,
      url:
        loc.protocol +
        "//" +
        loc.host +
        loc.pathname +
        "#name=" +
        peerName +
        "&addr=" +
        peerName +
        "@local.host",
    };
  }

  function addXdcPeer() {
    const { peerName, peerId, url } = getNextPeerUrl();
    const newWin = window.open(url, "_blank");

    const params = new URLSearchParams(window.location.hash.substr(1));
    params.set("next_peer", String(peerId + 1));
    window.location.hash = "#" + params.toString();

    // If popup was blocked or inside iframe
    if (!newWin) {
      const fallback = document.getElementById("webxdc-peer-link");
      if (fallback) {
        fallback.setAttribute("href", url);
        fallback.style.display = "inline";
        fallback.innerText = `Open ${peerName} ↗`;
      }
    }
  }

  window.addEventListener("load", async () => {
    const styleControlPanel =
      "position: fixed; bottom: 0.75rem; left: 0.75rem; background: rgba(24, 24, 27, 0.95); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 8px 12px; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #fff; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.5);";
    const styleMenuLink =
      "color: #ffdc10; text-decoration: none; font-weight: 500; cursor: pointer;";
    const styleAppIcon =
      "height: 1.25em; width: 1.25em; margin-right: 0.4em; border-radius: 4px; vertical-align: middle;";

    const currentName = window.webxdc.selfName;
    const targetPeer = currentName === "device0" ? "device1" : "device0";
    const targetUrl =
      window.location.protocol +
      "//" +
      window.location.host +
      window.location.pathname +
      `#name=${targetPeer}&addr=${targetPeer}@local.host`;

    const addPeerBtn = h(
      "a",
      { href: "javascript:void(0);", style: styleMenuLink },
      "Add Peer",
    );
    addPeerBtn.onclick = () => addXdcPeer();

    const switchBtn = h(
      "a",
      { href: targetUrl, style: styleMenuLink },
      `Switch to ${targetPeer}`,
    );

    const peerFallbackLink = h(
      "a",
      {
        id: "webxdc-peer-link",
        href: targetUrl,
        target: "_blank",
        style: styleMenuLink + "; display: none; margin-left: 6px;",
      },
      `Open ${targetPeer} ↗`,
    );

    const resetBtn = h(
      "a",
      { href: "javascript:void(0);", style: styleMenuLink },
      "Reset",
    );
    resetBtn.onclick = () => {
      window.localStorage.clear();
      window.location.hash = "";
      window.location.reload();
    };

    const header = h(
      "div",
      {
        style:
          "display: flex; align-items: center; margin-bottom: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa;",
      },
      h("span", {}, `Player: `),
      h("strong", { style: "color: #fff; margin-left: 4px;" }, currentName),
    );

    const icon = await getIcon();
    if (icon) {
      header.prepend(h("img", { src: icon, style: styleAppIcon }));
    }

    const controls = h(
      "div",
      {
        style: "display: flex; gap: 8px; align-items: center; flex-wrap: wrap;",
      },
      addPeerBtn,
      h("span", { style: "color: #52525b;" }, "•"),
      switchBtn,
      peerFallbackLink,
      h("span", { style: "color: #52525b;" }, "•"),
      resetBtn,
    );

    const controlPanel = h(
      "div",
      { id: "webxdc-dev-tools", style: styleControlPanel },
      header,
      controls,
    );

    document.body.append(controlPanel);
  });

  const params = new URLSearchParams(window.location.hash.substr(1));
  const selfAddr = params.get("addr") || "device0@local.host";
  return {
    sendUpdateInterval: 1000,
    sendUpdateMaxSize: 999999,
    selfAddr,
    selfName: params.get("name") || "device0",
    isAppSender: selfAddr === "device0@local.host",
    isBroadcast: false,
    setUpdateListener: (cb, serial = 0) => {
      const updates = getUpdates();
      const maxSerial = updates.length;
      updates.forEach((update) => {
        if (update.serial > serial) {
          update.max_serial = maxSerial;
          cb(update);
        }
      });
      updateListener = cb;
      return Promise.resolve();
    },
    joinRealtimeChannel: (cb) => {
      if (realtimeListener && realtimeListener.is_trashed()) {
        return;
      }
      const rt = new RealtimeListener();
      setTimeout(() => (realtimeListener = rt), 500);
      return rt;
    },
    getAllUpdates: () => {
      return Promise.resolve([]);
    },
    sendUpdate: (update) => {
      const updates = getUpdates();
      const serial = updates.length + 1;
      const _update = {
        payload: update.payload,
        summary: update.summary,
        info: update.info,
        notify: update.notify,
        href: update.href,
        document: update.document,
        serial: serial,
      };
      console.log(`[Webxdc] ${JSON.stringify(_update)}`);
      _update._sender = window.webxdc.selfAddr;
      updates.push(_update);
      window.localStorage.setItem(updatesKey, JSON.stringify(updates));
      _update.max_serial = serial;
      updateListener(_update);
    },
    sendToChat: async (content) => {
      if (!content.file && !content.text) {
        return Promise.reject(
          "Error from sendToChat: either file or text need to be set",
        );
      }
      const msg = `[Webxdc sendToChat] ${content.text || ""}`;
      console.log(msg, content);
      if (content.file && content.file.plainText) {
        const blob = new Blob([content.file.plainText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = h("a", {
          href: url,
          download: content.file.name || "game.pgn",
        });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    },
    importFiles: (filters) => {
      const accept = [
        ...(filters.extensions || []),
        ...(filters.mimeTypes || []),
      ].join(",");
      const element = h("input", {
        type: "file",
        accept,
        multiple: filters.multiple || false,
      });
      const promise = new Promise((resolve) => {
        element.onchange = () => {
          const files = Array.from(element.files || []);
          document.body.removeChild(element);
          resolve(files);
        };
      });
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      return promise;
    },
  };
})();
