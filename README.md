# Watches - Login e Cadastro de Relógios

Site estático com login usando Firebase Authentication e cadastro de relógios no Firestore, pronto para deploy no GitHub Pages.

## Estrutura

- `index.html`: layout da página de login e formulário de relógios.
- `styles.css`: visual responsivo da interface.
- `app.js`: integração com Firebase Auth e Firestore (salvar/listar relógios).
- `.github/workflows/deploy-pages.yml`: publicação automática no GitHub Pages.

## 1) Criar e configurar Firebase

1. Crie um projeto no Firebase Console.
2. Em **Authentication > Sign-in method**, habilite **Email/Password**.
3. Em **Firestore Database**, crie o banco em modo de produção ou teste.
4. Em **Project settings > Your apps > Web app**, copie o objeto de configuração.
5. Abra `app.js` e substitua os valores `COLE_AQUI_...` com os dados reais.

## 2) Modelo de dados de relógio

Cada relógio salvo contém:

- `brand` (Marca)
- `model` (Modelo)
- `purchaseDate` (Data da compra)
- `price` (Preço)
- `hasBattery` (Se usa bateria)
- `batteryDuration` (Duração da bateria, quando aplicável)

Os registros são guardados em:

- `users/{uid}/watches/{watchId}`

## 3) Regras iniciais (exemplo)

Use regras adequadas ao seu cenário. Exemplo mínimo para permitir usuário autenticado gravar o próprio documento em `ultimoLogin/{uid}` e seus relógios em `users/{uid}/watches/{watchId}`:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ultimoLogin/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    match /users/{uid}/watches/{watchId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 4) Rodar localmente

Abra `index.html` com uma extensão de servidor local no VS Code (ex.: Live Server), ou publique direto no GitHub Pages.

## 5) Publicar no GitHub Pages

1. Faça push para a branch `main`.
2. No GitHub: **Settings > Pages > Build and deployment**.
3. Selecione **Source: GitHub Actions**.
4. O workflow `Deploy static site to Pages` fará o deploy automático.

## Observação de segurança

As chaves de configuração web do Firebase não são segredos. A segurança real vem das regras do Firestore e das políticas de autenticação.
