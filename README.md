# n8n-nodes-plume

Official [n8n](https://n8n.io) community node for [Plume](https://plumenewsletter.com) — the self-hostable newsletter platform.

Two nodes:

- **Plume Trigger** — start workflows on `subscriber.created`, `subscriber.confirmed`, or `campaign.sent`. Registers a webhook on your Plume instance automatically and verifies every delivery's HMAC signature.
- **Plume** — create subscribers, unsubscribe, create campaign drafts, send campaigns to a list or segment, fetch lists/segments.

## Install

Self-hosted n8n: **Settings → Community Nodes → Install** → `n8n-nodes-plume`.

## Credentials

1. In Plume: **Settings → API Keys → New key** (copy the `plume_...` key — shown once).
2. In n8n: create **Plume API** credentials with your instance's base URL (e.g. `https://news.example.com`) and the key.

The credential test calls `GET /api/me`, so a wrong URL or key fails immediately.

## Example: Typeform → Plume

Typeform Trigger → **Plume: Create Subscriber** (pick a list from the dropdown, map the email field). Done — new form responses become newsletter subscribers.

## Example: welcome workflow

**Plume Trigger** (`subscriber.confirmed`) → Slack message to #growth with the new subscriber's email.

## Development

```bash
npm install
npm run lint && npm run build && npm test
```

Manual smoke: `npm link` into a local n8n (`~/.n8n/custom/`), point credentials at a local Plume (`make dev` in the plume repo).

## License

MIT
