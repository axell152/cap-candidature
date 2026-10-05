import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import Stripe from "stripe";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const isProduction = process.env.VERCEL_ENV === "production";
const testMode = process.env.TEST_MODE === "true" && !isProduction;
const TEST_PREFIX = "cap-candidature:test-checkout:";

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Méthode non autorisée." });
  const missing = ["OPENAI_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"].filter((name) => !process.env[name]);
  if (!testMode && !process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (missing.length) {
    console.error("Configuration manquante:", missing.join(", "), "| VERCEL_ENV =", process.env.VERCEL_ENV || "local", "| TEST_MODE =", process.env.TEST_MODE || "(vide)");
    let message = "Le paiement est temporairement indisponible. Réessaie plus tard.";
    if (!isProduction) message = "Configuration manquante sur ce déploiement (" + (process.env.VERCEL_ENV || "local") + ") : " + missing.join(", ") + ".";
    else if (process.env.TEST_MODE === "true" && missing.includes("STRIPE_SECRET_KEY")) message = "Le mode test est désactivé sur le déploiement Production. Ouvre une URL Preview pour tester sans paiement.";
    return response.status(503).json({ error: message });
  }

  const { requestId, browserToken } = request.body || {};
  if (typeof requestId !== "string" || !UUID_PATTERN.test(requestId) || typeof browserToken !== "string" || !UUID_PATTERN.test(browserToken)) {
    return response.status(400).json({ error: "Recharge la page puis réessaie de démarrer le paiement." });
  }

  const redis = Redis.fromEnv();
  const clientAddress = request.headers["x-vercel-forwarded-for"] || request.headers["x-forwarded-for"] || "unknown";
  const addressHash = createHash("sha256").update(String(clientAddress)).digest("hex");
  try {
    if (testMode) {
      const rateKey = "cap-candidature:test-checkout-rate:" + addressHash;
      const attempts = await redis.incr(rateKey);
      if (attempts === 1) await redis.expire(rateKey, 86400);
      if (attempts > 5) return response.status(429).json({ error: "Limite de tests atteinte pour aujourd'hui. Réessaie demain." });
    } else {
      const rateKey = "cap-candidature:checkout-rate:" + addressHash;
      const attempts = await redis.incr(rateKey);
      if (attempts === 1) await redis.expire(rateKey, 60);
      if (attempts > 8) return response.status(429).json({ error: "Trop de tentatives de paiement. Attends une minute puis réessaie." });
    }

    const host = request.headers["x-forwarded-host"] || request.headers.host;
    if (typeof host !== "string" || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
      return response.status(400).json({ error: "Impossible de préparer le retour du paiement." });
    }
    const configuredOrigin = process.env.SITE_URL || "https://" + (process.env.VERCEL_URL || host);
    const originUrl = new URL(configuredOrigin);
    if (originUrl.protocol !== "https:" || originUrl.username || originUrl.password) {
      return response.status(503).json({ error: "L'adresse de retour n'est pas configurée." });
    }
    const origin = originUrl.origin;

    if (testMode) {
      const key = TEST_PREFIX + requestId;
      const created = await redis.set(key, browserToken, { nx: true, ex: 1800 });
      if (!created && await redis.get(key) !== browserToken) {
        return response.status(409).json({ error: "Cette demande de test a déjà été utilisée." });
      }
      return response.status(200).json({ url: origin + "/?session_id=test_" + requestId + "#outil", testMode: true });
    }

    if (!process.env.STRIPE_SECRET_KEY) return response.status(503).json({ error: "Le paiement est temporairement indisponible." });
    const priceInCents = Number(process.env.ANALYSIS_PRICE_CENTS || 490);
    if (!Number.isSafeInteger(priceInCents) || priceInCents < 50 || priceInCents > 100000) {
      console.error("Invalid ANALYSIS_PRICE_CENTS configuration");
      return response.status(503).json({ error: "Le tarif est temporairement indisponible." });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: "Analyse personnalisée de candidature", description: "Une analyse de CV comparé à une offre d'emploi." },
          unit_amount: priceInCents,
        },
        quantity: 1,
      }],
      success_url: origin + "/?session_id={CHECKOUT_SESSION_ID}#outil",
      cancel_url: origin + "/#outil",
      client_reference_id: browserToken,
      metadata: { product: "application-analysis" },
    }, { idempotencyKey: "cap-candidature-checkout-" + requestId });
    return response.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Checkout creation failed", error.message);
    return response.status(500).json({ error: "Impossible de préparer le paiement pour le moment." });
  }
}
