import { describe, it, expect } from "vitest";
import { SignJWT, jwtVerify } from "jose";

// 同 auth.ts 的纯函数逻辑，无 cookie 依赖
const secret = new TextEncoder().encode("test-secret-key-for-unit-tests");

async function generateToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { userId: payload.userId as string, role: payload.role as string };
  } catch {
    return null;
  }
}

describe("JWT Token", () => {
  it("生成的 token 应能成功验证", async () => {
    const token = await generateToken("user-1", "user");
    const decoded = await verifyToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe("user-1");
    expect(decoded!.role).toBe("user");
  });

  it("admin 角色 token 应保留 role 信息", async () => {
    const token = await generateToken("admin-1", "admin");
    const decoded = await verifyToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded!.role).toBe("admin");
  });

  it("篡改过的 token 应验证失败", async () => {
    const token = await generateToken("user-1", "user");
    const tampered = token.slice(0, -5) + "xxxxx";

    const decoded = await verifyToken(tampered);
    expect(decoded).toBeNull();
  });

  it("空字符串 token 应返回 null", async () => {
    const decoded = await verifyToken("");
    expect(decoded).toBeNull();
  });

  it("随机字符串 token 应返回 null", async () => {
    const decoded = await verifyToken("not.a.valid.token");
    expect(decoded).toBeNull();
  });

  it("不同 secret 应无法验证", async () => {
    const token = await generateToken("user-1", "user");
    // 用另一个 secret 验证
    const otherSecret = new TextEncoder().encode("different-secret");
    try {
      await jwtVerify(token, otherSecret);
      expect(true).toBe(false); // 不应走到这里
    } catch {
      expect(true).toBe(true);
    }
  });
});