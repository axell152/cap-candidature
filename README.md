# Cap Candidature

Outil qui compare le texte d'un CV à une offre d'emploi et propose des pistes de reformulation fidèles aux informations fournies. Il ne promet ni entretien ni embauche.

## Parcours

1. La personne saisit son CV et une offre.
2. Une session Stripe Checkout est créée côté serveur.
3. Au retour du paiement, le serveur confirme le règlement auprès de Stripe.
4. L'API OpenAI rédige une analyse structurée. Chaque paiement autorise une analyse.

Les saisies restent temporairement dans le stockage de session du navigateur pour survivre à la redirection vers Stripe. Les textes sont envoyés à OpenAI pour générer le rapport; ils ne sont pas conservés dans une base du site.

## Développement local

1. Installer Node.js et Git.
2. Installer les dépendances avec `npm install`.
3. Copier `.env.example` vers `.env.local` et renseigner les variables.
4. Lancer `npx vercel dev`.
5. Utiliser d'abord les clés de test Stripe.

## Configuration

Voir [CONFIGURATION.md](CONFIGURATION.md) pour les variables Vercel, Stripe et Upstash. Sans clés serveur ou base Redis, le paiement est refusé proprement. Ne jamais committer les secrets.

## Déploiement

Le dépôt GitHub est relié à Vercel. Les changements sur `main` déclenchent un déploiement. Tester d'abord avec Stripe en mode test et vérifier les variables dans Vercel avant d'activer la production.

Avant d'accepter des paiements réels, compléter les informations légales, la politique de confidentialité, les conditions de vente et les obligations applicables au traitement des CV.
