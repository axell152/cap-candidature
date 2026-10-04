const cvInput = document.querySelector("#cv");
const jobInput = document.querySelector("#job");
const button = document.querySelector("#analyze");
const statusBox = document.querySelector("#status");
const resultBox = document.querySelector("#result");
const resultContent = document.querySelector("#result-content");
const draftKey = "cap-candidature:pending-analysis";
const requestKey = "cap-candidature:checkout-request";
const tokenKey = "cap-candidature:browser-token";
const makeId = () => crypto.randomUUID();
const browserToken = () => {
  let token = sessionStorage.getItem(tokenKey);
  if (!token) { token = makeId(); sessionStorage.setItem(tokenKey, token); }
  return token;
};
const count = (field, selector) => {
  document.querySelector(selector).textContent = field.value.length.toLocaleString("fr-FR") + " / 12 000";
};
const setStatus = (message, type = "") => {
  statusBox.textContent = message;
  statusBox.className = ("status " + type).trim();
};
const restoreDraft = () => {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey) || "null");
    if (!draft || typeof draft.cv !== "string" || typeof draft.job !== "string" || draft.cv.length > 12000 || draft.job.length > 12000) return false;
    cvInput.value = draft.cv; jobInput.value = draft.job;
    count(cvInput, "#cv-count"); count(jobInput, "#job-count");
    return true;
  } catch { sessionStorage.removeItem(draftKey); return false; }
};
for (const [field, selector] of [[cvInput, "#cv-count"], [jobInput, "#job-count"]]) field.addEventListener("input", () => count(field, selector));
const draftRestored = restoreDraft();
const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const formatReport = (text) => escapeHtml(text).replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h3>$1</h3>").split(String.fromCharCode(10)).join("<br>");
const sessionFromUrl = () => new URLSearchParams(window.location.search).get("session_id");


button.addEventListener("click", async () => {
  const cv = cvInput.value.trim(), job = jobInput.value.trim();
  if (cv.length < 100 || job.length < 100) { setStatus("Ajoute un peu plus de contenu dans les deux champs pour obtenir une analyse utile.", "error"); return; }
  button.disabled = true; resultBox.hidden = true;
  try {
    let sessionId = sessionFromUrl();
    if (!sessionId) {
      sessionStorage.setItem(draftKey, JSON.stringify({ cv, job }));
      let requestId = sessionStorage.getItem(requestKey);
      if (!requestId) { requestId = makeId(); sessionStorage.setItem(requestKey, requestId); }
      setStatus("Préparation de la session…");
      const checkoutResponse = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, browserToken: browserToken() }) });
      const checkout = await checkoutResponse.json();
      if (!checkoutResponse.ok) throw new Error(checkout.error || "La session n'a pas pu démarrer.");
      sessionStorage.removeItem(requestKey);
      if (checkout.testMode) {
        sessionId = "test_" + requestId;
        document.querySelector(".price-chip strong").textContent = "Gratuit";
        document.querySelector(".price-chip small").textContent = "mode de test";
        setStatus("Mode test actif : aucun paiement ne sera effectué.");
      } else { setStatus("Ouverture du paiement sécurisé…"); window.location.assign(checkout.url); return; }
    }
    const isTestSession = sessionId.startsWith("test_");
    setStatus(isTestSession ? "Analyse de test en cours, sans paiement…" : "Analyse en cours. Garde cette page ouverte quelques instants…");
    const analysisResponse = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cv, job, sessionId, browserToken: browserToken() }) });
    const data = await analysisResponse.json();
    if (!analysisResponse.ok) throw new Error(data.error || "L'analyse a échoué. Réessaie dans un instant.");
    resultContent.innerHTML = formatReport(data.report); resultBox.hidden = false;
    sessionStorage.removeItem(draftKey);
    setStatus(data.testMode ? "Test terminé : l'analyse a été générée sans paiement." : "Analyse terminée. Tu peux copier le résultat et adapter les propositions.", "success");
    history.replaceState({}, "", window.location.pathname + "#result");
    resultBox.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { setStatus(error.message, "error"); }
  finally { button.disabled = false; }
});


document.querySelector("#copy").addEventListener("click", async () => {
  const copyButton = document.querySelector("#copy");
  try { await navigator.clipboard.writeText(resultContent.innerText); copyButton.innerHTML = "Résultat copié <span>✓</span>"; setTimeout(() => { copyButton.innerHTML = "Copier le résultat <span>⧉</span>"; }, 1800); }
  catch { setStatus("La copie automatique n'est pas disponible sur cet appareil. Sélectionne le texte du résultat.", "error"); }
});
if (sessionFromUrl()) {
  setStatus(sessionFromUrl().startsWith("test_") ? "Mode test actif : aucun paiement n'a été effectué. Tes textes ont été restaurés; clique pour lancer l'analyse." : draftRestored ? "Paiement confirmé. Tes textes ont été restaurés. Clique pour lancer l'analyse." : "Paiement confirmé. Les textes saisis avant le paiement n'ont pas été retrouvés. Tu peux les saisir maintenant.", "success");
  document.querySelector("#outil").scrollIntoView({ behavior: "smooth", block: "start" });
} else if (draftRestored) setStatus("Tes textes ont été restaurés dans cet onglet. Ils seront effacés après l'analyse.", "success");
