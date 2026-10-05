# Mise en service

Le site peut etre publie sans activer les paiements. Si la configuration manque, l'API ne cree aucune session Stripe.

## Variables Vercel

Dans Project Settings > Environment Variables, ajouter en Preview et Production :

- OPENAI_API_KEY : cle privee OpenAI, uniquement dans Vercel.
- STRIPE_SECRET_KEY : cle secrete Stripe. Commencer par sk_test_.
- UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN : identifiants REST Upstash Redis pour le verrou anti-doublon.
- SITE_URL : URL publique HTTPS du projet Vercel.
- OPENAI_MODEL : facultatif, modele autorise dans le compte OpenAI.
- TEST_MODE : mettre `true` uniquement dans l'environnement **Preview** pour tester sans paiement Stripe. Ignore en Production, par securite.

Ne pas publier les secrets dans GitHub ni les transmettre dans une conversation. Apres leur ajout, redemarrer un deploiement Vercel.

## Stripe et donnees

Utiliser d'abord des cles Stripe de test et verifier un paiement complet avant la production. Le serveur verifie le paiement et empeche qu'une session soit utilisee plusieurs fois.

Les textes du CV et de l'offre sont envoyes a l'API OpenAI pour produire le rapport. Les champs sont conserves temporairement dans le navigateur pendant le paiement afin de les restaurer au retour.

## Tester sans payer

Le mode test est volontairement desactive sur le deploiement Production (branche `main`). Pour l'utiliser :

1. Dans Vercel > Settings > Environment Variables, ajouter `TEST_MODE=true` avec la portee **Preview** uniquement. Les variables OPENAI_API_KEY, UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN doivent aussi etre cochees pour Preview.
2. Pousser une branche (ou ouvrir une PR) : Vercel cree une URL de Preview.
3. Ouvrir cette URL de Preview, pas le domaine de production. Le bouton affiche alors "Gratuit - mode de test".

Si la configuration est incomplete, l'erreur affichee sur une Preview liste les variables manquantes. Sur Production, elle reste generique et le detail est dans les logs Vercel.
