const q = document.getElementById("q");
const go = document.getElementById("go");
const w = document.querySelector(".word");
const ph = document.querySelector(".phon");
const df = document.querySelector(".def");

async function lookup(word) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "lookup", word }, (res) => resolve(res));
  });
}

go.addEventListener("click", async () => {
  const word = (q.value || "").trim();
  if (!word) return;
  w.textContent = word;
  ph.textContent = "";
  df.textContent = "Loading...";
  const res = await lookup(word);
  if (!res?.ok || !res.data) {
    df.textContent = "No definition found.";
    return;
  }
  const data = res.data;
  w.textContent = data.word || word;
  ph.textContent = data.phonetic ? `/${data.phonetic}/` : "";
  const m = (data.meanings || []).find(x => x.definition);
  df.textContent = m?.definition || "No definition found.";
});
