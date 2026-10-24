# Sistema CIPA

Sistema web para administrar eleições da CIPA, cadastrar funcionários e candidatos, liberar a urna e consultar resultados. A autenticação e os dados são fornecidos pelo Supabase.

## Requisitos

- Node.js compatível com a versão instalada do Next.js
- Projeto Supabase configurado
- Variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no arquivo `.env.local`

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Verificações

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Deploy

O deploy de produção pode ser feito pela integração do repositório GitHub com a Vercel.
