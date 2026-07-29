import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Kicks off the Mercado Libre OAuth Authorization Code flow.
// Visit this route (logged in as admin) once to grant/renew access;
// the callback stores the token pair so jobs can refresh it automatically.
export async function GET(req) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.ML_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "ML_CLIENT_ID not configured" }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/ml/callback`;
  const state = crypto.randomUUID();

  const authorizeUrl = new URL("https://auth.mercadolibre.com.mx/authorization");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set("ml_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
