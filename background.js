// background.js
// Simple cache with TTL stored in chrome.storage.local
const TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

async function getFromCache(key) {
  const now = Date.now();
  const { cache = {} } = await chrome.storage.local.get("cache");
  const entry = cache[key];
  if (!entry) return null;
  if (now - entry.timestamp > TTL_MS) return null;
  return entry.value;
}

async function setInCache(key, value) {
  const { cache = {} } = await chrome.storage.local.get("cache");
  cache[key] = { value, timestamp: Date.now() };
  await chrome.storage.local.set({ cache });
}

async function fetchDefinition(word) {
  const key = word.toLowerCase().trim();
  if (!key) return null;

  const cached = await getFromCache(key);
  if (cached) return cached;

  // Free Dictionary API
  // Docs/examples demonstrate JSON payload with meanings, phonetics, etc.
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`;
  const resp = await fetch(url, { method: "GET" });
  if (!resp.ok) {
    // API returns 404 for not found
    return null;
  }
  const data = await resp.json();
  // Store lightweight subset to minimize storage usage
  const simplified = simplifyDictionaryResponse(data);
  await setInCache(key, simplified);
  return simplified;
}

function simplifyDictionaryResponse(data) {
  try {
    const first = Array.isArray(data) ? data[0] : data;
    const word = first.word || "";
    const phonetic =
      first.phonetic ||
      (first.phonetics && first.phonetics.find(p => p.text)?.text) ||
      "";
    const meanings =
      (first.meanings || []).map(m => ({
        partOfSpeech: m.partOfSpeech || "",
        definition: m.definitions?.[0]?.definition || "",
        example: m.definitions?.[0]?.example || ""
      })) || [];
    return { word, phonetic, meanings };
  } catch (e) {
    return null;
  }
}

// Message router between content script and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "lookup") {
    const { word } = message;
    fetchDefinition(word)
      .then(result => sendResponse({ ok: true, data: result }))
      .catch(err => sendResponse({ ok: false, error: String(err) }));
    return true; // keep channel open for async sendResponse
  }
});
