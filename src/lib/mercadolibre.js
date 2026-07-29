import { prisma } from "@/lib/db";

const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";
// Refresh a bit before actual expiry to avoid racing a token that dies mid-request.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("ML_CLIENT_ID / ML_CLIENT_SECRET not configured");
  }

  const res = await fetch(ML_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to refresh Mercado Libre token: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Returns a valid Mercado Libre access token, refreshing it first if it's
 * expired or about to expire. Throws if no token has been granted yet
 * (visit /api/ml/authorize as an admin to grant one).
 */
export async function getValidAccessToken() {
  const record = await prisma.mercadoLibreToken.findFirst();

  if (!record) {
    throw new Error("No Mercado Libre token on file. Visit /api/ml/authorize while logged in as admin.");
  }

  if (record.expiresAt.getTime() - REFRESH_MARGIN_MS > Date.now()) {
    return record.accessToken;
  }

  const data = await refreshAccessToken(record.refreshToken);

  const updated = await prisma.mercadoLibreToken.update({
    where: { id: record.id },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return updated.accessToken;
}

/**
 * Returns { Authorization: "Bearer ..." } for use in fetch() headers.
 */
export async function getMlAuthHeader() {
  const token = await getValidAccessToken();
  return { Authorization: `Bearer ${token}` };
}
