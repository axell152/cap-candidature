# Mise en service

Le site peut etre publie sans activer les paiements. Si la configuration manque, l'API ne cree aucune session Stripe.

## Variables Vercel

Dans Project Settings > Environment Variables, ajouter en Preview et Production :

- OPENAI_API_KEY : cle privee OpenAI, uniquement dans Vercel.
- STRIPE_SECRET_KEY : cle secrete Stripe. Commencer par sk_test_.
- UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN : identifiants REST Upstash Redis pour le verrou anti-doublon.
- SITE_URL : URL publique HTTPS du projet Vercel.
- OPENAI_MODEL : facultatif, modele autorise dans le compte OpenAI.

Ne pas publier les secrets dans GitHub ni les transmettre dans une conversation. Apres leur ajout, redemarrer un deploiement Vercel.

## Stripe et donnees

Utiliser d'abord des cles Stripe de test et verifier un paiement complet avant la production. Le serveur verifie le paiement et empeche qu'une session soit utilisee plusieurs fois.

Les textes du CV et de l'offre sont envoyes a l'API OpenAI pour produire le rapport. Les champs sont conserves temporairement dans le navigateur pendant le paiement afin de les restaurer au retour.
