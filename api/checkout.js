import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import Stripe from "stripe";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Méthode non autorisée." });
  if (!process.env.OPENAI_API_KEY || !process.env.STRIPE_SECRET_KEY || !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return response.status(503).json({ error: "Le paiement est temporairement indisponible. Réessaie plus tard." });
  }

  const { requestId, browserToken } = request.body || {};
  if (typeof requestId !== "string" || !UUID_PATTERN.test(requestId) || typeof browserToken !== "string" || !UUID_PATTERN.test(browserToken)) {
    return response.status(400).json({ error: "Recharge la page puis réessaie de démarrer le paiement." });
  }

  const priceInCents = Number(process.env.ANALYSIS_PRICE_CENTS || 490);
  if (!Number.isSafeInteger(priceInCents) || priceInCents < 50 || priceInCents > 100000) {
    console.error("Invalid ANALYSIS_PRICE_CENTS configuration");
    return response.status(503).json({ error: "Le tarif est temporairement indisponible." });
  }

  const redis = Redis.fromEnv();
  const clientAddress = request.headers["x-vercel-forwarded-for"] || request.headers["x-forwarded-for"] || "unknown";
  const addressHash = createHash("sha256").update(String(clientAddress)).digest("hex");
  const rateKey = `cap-candidature:checkout-rate:${addressHash}`;
  try {
    const attempts = await redis.incr(rateKey);
    if (attempts === 1) await redis.expire(rateKey, 60);
    if (attempts > 8) return response.status(429).json({ error: "Trop de tentatives de paiement. Attends une minute puis réessaie." });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const host = request.headers["x-forwarded-host"] || request.headers.host;
    if (typeof host !== "string" || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
      return response.status(400).json({ error: "Impossible de préparer le retour du paiement." });
    }
    const configuredOrigin = process.env.SITE_URL || `https://${process.env.VERCEL_URL || host}`;
    const originUrl = new URL(configuredOrigin);
    if (originUrl.protocol !== "https:" || originUrl.username || originUrl.password) {
      return response.status(503).json({ error: "L'adresse de retour du paiement n'est pas configurée." });
    }
    const origin = originUrl.origin;
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
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}#outil`,
      cancel_url: `${origin}/#outil`,
      client_reference_id: browserToken,
      metadata: { product: "application-analysis" },
    }, { idempotencyKey: `cap-candidature-checkout-${requestId}` });
    return response.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Checkout creation failed", error.message);
    return response.status(500).json({ error: "Impossible de préparer le paiement pour le moment." });
  }
}
