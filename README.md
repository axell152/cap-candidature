# Cap Candidature

Petit outil automatise qui compare un CV a une offre d'emploi et produit des pistes de reformulation. Le site ne demande pas de compte et n'enregistre pas les textes dans une base de donnees.

## Lancer en local

1. Installer Node.js et Git.
2. Depuis ce dossier, executer `npm install` puis `npx vercel dev`.
3. Creer `.env.local` a partir de `.env.example` et renseigner les cles OpenAI et Stripe.
4. Tester le paiement en mode test Stripe avant de publier.

Le site utilise les fonctions serveur Vercel dans `api/`. La cle OpenAI et la cle secrete Stripe restent cote serveur. Les documents sont transmis a l'API OpenAI pour la generation; le code demande `store: false` et ne sauvegarde pas les textes cote site. Avant un lancement public, il faut ajouter des pages de confidentialite et de conditions de vente adaptees a l'activite, verifier les exigences liees au traitement des donnees personnelles, tester le parcours de paiement et les frais/coûts reels.

## Variables d'environnement

- `OPENAI_API_KEY`: cle secrete API OpenAI.
- `OPENAI_MODEL`: modele a utiliser (par defaut `gpt-6-luna`).
- `STRIPE_SECRET_KEY`: cle secrete Stripe, d'abord en mode test.
- `ANALYSIS_PRICE_CENTS`: prix en centimes d'euro (defaut: `490`).

## Flux produit

1. L'utilisateur saisit le texte du CV et de l'offre.
2. Stripe Checkout confirme le paiement unique.
3. La fonction Vercel verifie la session payee.
4. L'API OpenAI genere une analyse structuree.
5. Le resultat est renvoye au navigateur; une session payee ne peut etre utilisee qu'une fois.

Ce prototype ne promet ni entretien ni embauche. L'utilisateur doit verifier les suggestions avant de les reprendre.
