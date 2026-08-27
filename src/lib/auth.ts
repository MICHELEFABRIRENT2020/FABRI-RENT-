import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { verifyTotpToken, consumeBackupCode } from "@/lib/totp";
import { decryptSecret } from "@/lib/crypto-secret";
import { logger } from "@/lib/logger";
import type { AppUserRole } from "@/types/next-auth";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}
class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}
class TwoFactorRequiredError extends CredentialsSignin {
  code = "totp_required";
}
class InvalidTwoFactorError extends CredentialsSignin {
  code = "totp_invalid";
}
class InvalidCredentialsError extends CredentialsSignin {
  code = "credentials_invalid";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required behind a reverse proxy / container network (Docker, most PaaS)
  // where the Host header Next.js sees doesn't match NEXTAUTH_URL directly -
  // Auth.js then trusts X-Forwarded-Host instead of hard-rejecting the
  // request. Safe here because inbound traffic terminates at a proxy we
  // control (see DEPLOYMENT.md); never enable this if arbitrary Host
  // headers can reach the app directly from the internet.
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12h - back-office handles financial/personal data, keep sessions short-lived
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "Codice 2FA", type: "text" },
        backupCode: { label: "Codice di backup", type: "text" },
      },
      authorize: async (credentials, request) => {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        const totp = (credentials?.totp as string | undefined)?.trim();
        const backupCode = (credentials?.backupCode as string | undefined)?.trim();
        if (!email || !password) throw new InvalidCredentialsError();

        const ip = clientIp(request.headers);
        const limit = await rateLimit("login", `${email}:${ip}`, RATE_LIMITS.login);
        if (!limit.allowed) {
          logger.warn({ email, ip }, "[auth] login rate limit exceeded");
          throw new RateLimitedError();
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          // Constant-time-ish: still run a bcrypt compare against a dummy hash so
          // a nonexistent-email response doesn't return measurably faster.
          await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinva");
          throw new InvalidCredentialsError();
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await logAudit({ tenantId: user.tenantId, actorId: user.id, action: "login_blocked_locked", entityType: "user", entityId: user.id, metadata: { ip } });
          throw new AccountLockedError();
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
          const attempts = user.failedLoginAttempts + 1;
          const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: attempts, lockedUntil },
          });
          await logAudit({
            tenantId: user.tenantId,
            actorId: user.id,
            action: lockedUntil ? "login_failed_locked" : "login_failed",
            entityType: "user",
            entityId: user.id,
            metadata: { ip, attempts },
          });
          throw new InvalidCredentialsError();
        }

        if (user.twoFactorEnabled) {
          let twoFactorOk = false;
          if (backupCode) {
            const remaining = await consumeBackupCode(user.twoFactorBackupCodes, backupCode);
            if (remaining) {
              twoFactorOk = true;
              await prisma.user.update({ where: { id: user.id }, data: { twoFactorBackupCodes: remaining } });
              await logAudit({ tenantId: user.tenantId, actorId: user.id, action: "login_2fa_backup_code_used", entityType: "user", entityId: user.id, metadata: { ip, remainingCodes: remaining.length } });
            }
          } else if (totp && user.twoFactorSecret) {
            twoFactorOk = await verifyTotpToken(decryptSecret(user.twoFactorSecret), totp);
          }

          if (!totp && !backupCode) throw new TwoFactorRequiredError();
          if (!twoFactorOk) {
            const twoFaLimit = await rateLimit("2fa-verify", `${user.id}:${ip}`, RATE_LIMITS.twoFactorVerify);
            if (!twoFaLimit.allowed) throw new RateLimitedError();
            await logAudit({ tenantId: user.tenantId, actorId: user.id, action: "login_2fa_failed", entityType: "user", entityId: user.id, metadata: { ip } });
            throw new InvalidTwoFactorError();
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        await logAudit({ tenantId: user.tenantId, actorId: user.id, action: "login_success", entityType: "user", entityId: user.id, metadata: { ip } });

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          locationId: user.locationId,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.locationId = user.locationId;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as AppUserRole;
        session.user.tenantId = token.tenantId as string | null;
        session.user.locationId = token.locationId as string | null;
      }
      return session;
    },
  },
});
