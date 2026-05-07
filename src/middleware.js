export { auth as middleware } from "@/auth";

export const config = {
  // Only apply to /admin and its subroutes
  matcher: ["/admin/:path*"],
};
