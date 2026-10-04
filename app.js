const cvInput = document.querySelector("#cv");
const jobInput = document.querySelector("#job");
const button = document.querySelector("#analyze");
const statusBox = document.querySelector("#status");
const resultBox = document.querySelector("#result");
const resultContent = document.querySelector("#result-content");
const draftStorageKey = "cap-candidature:pending-analysis";
const checkoutRequestKey = "cap-candidature:checkout-request";
const browserTokenKey = "cap-candidature:browser-token";

const makeId = () => crypto.randomUUID();

const getBrowserToken = () => {
  let token = sessionStorage.getItem(browserTokenKey);
  if (!token) {
    token = makeId();
    sessionStorage.setItem(browserTokenKey, token);
  }
  return token;
};

const updateCounter = (field, selector) => {
  document.querySelector(selector).textContent = `${field.value.length.toLocaleString("fr-FR")} / 12 000`;
};

const restoreDraft = () => {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftStorageKey) || "null");
    if (!draft || typeof draft.cv !== "string" || typeof draft.job !== "string") return false;
    if (draft.cv.length > 12000 || draft.job.length > 12000) return false;
    cvInput.value = draft.cv;
    jobInput.value = draft.job;
    updateCounter(cvInput, "#cv-count");
    updateCounter(jobInput, "#job-count");
    return true;
  } catch {
    sessionStorage.removeItem(draftStorageKey);
    return false;
  }
};

for (const [field, counter] of [[cvInput, "#cv-count"], [jobInput, "#job-count"]]) {
  field.addEventListener("input", () => {
    updateCounter(field, counter);
  });
}

const draftRestored = restoreDraft();

const setStatus = (message, type = "") => {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`.trim();
};

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

const formatReport = (text) => escapeHtml(text)
  .replace(/^### (.+)$/gm, "<h3>$1</h3>")
  .replace(/^## (.+)$/gm, "<h3>$1</h3>")
  .replace(/^- (.+)$/gm, "• $1")
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/\n/g, "<br>");

const sessionFromUrl = () => new URLSearchParams(window.location.search).get("session_id");

button.addEventListener("click", async () => {
  const cv = cvInput.value.trim();
  const job = jobInput.value.trim();
  if (cv.length < 100 || job.length < 100) {
    setStatus("Ajoute un peu plus de contenu dans les deux champs pour obtenir une analyse utile.", "error");
    return;
  }
  button.disabled = true;
  resultBox.hidden = true;
  try {
    let sessionId = sessionFromUrl();
    if (!sessionId) {
      sessionStorage.setItem(draftStorageKey, JSON.stringify({ cv, job }));
      let requestId = sessionStorage.getItem(checkoutRequestKey);
      if (!requestId) {
        requestId = makeId();
        sessionStorage.setItem(checkoutRequestKey, requestId);
      }
      setStatus("Ouverture du paiement sécurisé…");
      const checkoutResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, browserToken: getBrowserToken() }),
      });
      const checkout = await checkoutResponse.json();
      if (!checkoutResponse.ok) throw new Error(checkout.error || "Le paiement n'a pas pu démarrer.");
      sessionStorage.removeItem(checkoutRequestKey);
      window.location.assign(checkout.url);
      return;
    }
    setStatus("Analyse en cours. Garde cette page ouverte quelques instants…");
    const response = await fetch("/api/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cv, job, sessionId, browserToken: getBrowserToken() }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "L'analyse a échoué. Réessaie dans un instant.");
    resultContent.innerHTML = formatReport(data.report);
    resultBox.hidden = false;
    sessionStorage.removeItem(draftStorageKey);
    setStatus("Analyse terminée. Tu peux copier le résultat et adapter les propositions.", "success");
    history.replaceState({}, "", `${window.location.pathname}#result`);
    resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#copy").addEventListener("click", async () => {
  const button = document.querySelector("#copy");
  try {
    await navigator.clipboard.writeText(resultContent.innerText);
    button.innerHTML = "Résultat copié <span>✓</span>";
    setTimeout(() => { button.innerHTML = "Copier le résultat <span>⧉</span>"; }, 1800);
  } catch {
    setStatus("La copie automatique n'est pas disponible sur cet appareil. Sélectionne le texte du résultat.", "error");
  }
});

if (sessionFromUrl()) {
  setStatus(draftRestored
    ? "Paiement confirmé. Tes textes ont été restaurés. Clique pour lancer l'analyse."
    : "Paiement confirmé. Les textes saisis avant le paiement n'ont pas été retrouvés. Tu peux les saisir maintenant.", "success");
  document.querySelector("#outil").scrollIntoView({ behavior: "smooth", block: "start" });
} else if (draftRestored) {
  setStatus("Tes textes ont été restaurés dans cet onglet. Ils seront effacés après l'analyse.", "success");
}
