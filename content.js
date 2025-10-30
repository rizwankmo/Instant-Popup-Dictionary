// content.js
let tooltip;
let currentSelection = "";

function createTooltip() {
  tooltip = document.createElement("div");
  tooltip.id = "instant-dict-tooltip";
  tooltip.innerHTML = `
    <div class="idict-header">
      <span class="idict-word"></span>
      <span class="idict-phonetic"></span>
    </div>
    <div class="idict-body">
      <div class="idict-meaning"></div>
    </div>
  `;
  tooltip.style.display = "none";
  document.documentElement.appendChild(tooltip);

  // Hide when clicking elsewhere
  document.addEventListener("mousedown", (e) => {
    if (!tooltip.contains(e.target)) hideTooltip();
  }, true);

  window.addEventListener("scroll", () => hideTooltip(), true);
  window.addEventListener("resize", () => hideTooltip(), true);
}

function showTooltipAt(rect) {
  if (!tooltip) createTooltip();
  const padding = 8;
  const top = window.scrollY + rect.bottom + padding;
  const left = window.scrollX + rect.left;
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  tooltip.style.display = "block";
}

function hideTooltip() {
  if (tooltip) tooltip.style.display = "none";
}

function setTooltipContent(data, word) {
  const wordEl = tooltip.querySelector(".idict-word");
  const phoneticEl = tooltip.querySelector(".idict-phonetic");
  const meaningEl = tooltip.querySelector(".idict-meaning");
  if (!data) {
    wordEl.textContent = word;
    phoneticEl.textContent = "";
    meaningEl.textContent = "No definition found.";
    return;
  }
  wordEl.textContent = data.word || word;
  phoneticEl.textContent = data.phonetic ? ` /${data.phonetic}/` : "";
  const m = (data.meanings || []).find(x => x.definition);
  meaningEl.textContent = m?.definition || "No definition found.";
}

// Selection handler
function onMouseUp(e) {
  const sel = window.getSelection();
  const text = sel ? sel.toString().trim() : "";
  if (!text || /\s/.test(text) || text.length > 64) { // one word, sane limit
    hideTooltip();
    currentSelection = "";
    return;
  }
  currentSelection = text;

  // Get bounding rect to position tooltip
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Show loading
  if (!tooltip) createTooltip();
  setTooltipContent({ word: text, phonetic: "", meanings: [{ definition: "Loading..." }] }, text);
  showTooltipAt(rect);

  chrome.runtime.sendMessage({ type: "lookup", word: text }, (res) => {
    if (!res?.ok) {
      setTooltipContent(null, text);
      return;
    }
    // Only update if selection hasn't changed
    if (text === currentSelection) {
      setTooltipContent(res.data, text);
      showTooltipAt(rect);
    }
  });
}

document.addEventListener("mouseup", onMouseUp, false);
