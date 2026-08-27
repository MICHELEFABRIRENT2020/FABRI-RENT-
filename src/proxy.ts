import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  const isDesk = pathname.startsWith("/desk");
  const isAdmin = pathname.startsWith("/admin");

  if (!isDesk && !isAdmin) return NextResponse.next();

  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdmin && role !== "super_admin") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (isDesk && role !== "operator" && role !== "super_admin") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/desk/:path*", "/admin/:path*"],
};
