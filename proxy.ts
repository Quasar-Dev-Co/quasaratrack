export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.png$|.*\\.svg$|sw\\.js|manifest\\.json|apple-touch-icon\\.png).*)"],
};
