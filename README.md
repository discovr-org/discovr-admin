# discovr-admin

Internal dashboard for discovr. Same brand tokens and design system as the guest app. Dark only.

```bash
cd discovr-admin
cp .env.example .env.local
npm install
npm run dev
```

Opens on [http://localhost:3001](http://localhost:3001).

## API base URL

All catalog calls use `NEXT_PUBLIC_API_BASE_URL` (`src/shared/utils/apiBase.ts`).

| Where | What to set |
| --- | --- |
| Local | `.env.local` → `http://127.0.0.1:8080` |
| Vercel / host | Same key → your Render API URL |

No trailing slash. Set before **build** (`NEXT_PUBLIC_*`).
