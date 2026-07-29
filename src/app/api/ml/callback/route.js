import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/admin?ml_auth=error&reason=${encodeURIComponent(error)}`);
  }

  const expectedState = req.cookies.get("ml_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${baseUrl}/admin?ml_auth=error&reason=invalid_state`);
  }

  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/admin?ml_auth=error&reason=missing_credentials`);
  }

  try {
    const res = await fetch(ML_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${baseUrl}/api/ml/callback`,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("ML token exchange failed:", res.status, text);
      return NextResponse.redirect(`${baseUrl}/admin?ml_auth=error&reason=token_exchange_failed`);
    }

    const data = await res.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    const existing = await prisma.mercadoLibreToken.findFirst();
    if (existing) {
      await prisma.mercadoLibreToken.update({
        where: { id: existing.id },
        data: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
        },
      });
    } else {
      await prisma.mercadoLibreToken.create({
        data: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
        },
      });
    }

    const response = NextResponse.redirect(`${baseUrl}/admin?ml_auth=success`);
    response.cookies.delete("ml_oauth_state");
    return response;
  } catch (err) {
    console.error("Error in ML OAuth callback:", err);
    return NextResponse.redirect(`${baseUrl}/admin?ml_auth=error&reason=internal_error`);
  }
}
