// Public deployment on the Hetzner box. Reachable from any device with
// internet — no Tailscale required.
//
// Server lives at /opt/feelfree-api, started via PM2 (process: feelfree-api).
// To redeploy: rsync the local server/ folder up, then `pm2 restart feelfree-api`.
const PORT = 3900;
const HOST = '91.99.194.149';

export const API_BASE = `http://${HOST}:${PORT}`;
