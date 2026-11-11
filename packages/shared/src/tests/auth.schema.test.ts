import { describe, it, expect } from "vitest";
import { LoginSchema, SignUpSchema } from "../schemas/auth";

describe("LoginSchema", () => {
  it("accepts valid credentials and normalizes email", () => {
    const res = LoginSchema.safeParse({
      email: "  RESEARCHER@EpiLens.in ",
      password: "SecretPassword123!",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.email).toBe("researcher@epilens.in");
    }
  });

  it("rejects invalid emails or empty passwords", () => {
    expect(LoginSchema.safeParse({ email: "invalid-email", password: "123" }).success).toBe(false);
    expect(LoginSchema.safeParse({ email: "valid@test.com", password: "" }).success).toBe(false);
  });
});

describe("SignUpSchema", () => {
  it("accepts valid registration data", () => {
    const res = SignUpSchema.safeParse({
      name: "Dr. Anubhav Singh",
      email: "anubhav@punjab-covid.res.in",
      password: "EpidemicPassword2020",
      confirmPassword: "EpidemicPassword2020",
    });
    expect(res.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const res = SignUpSchema.safeParse({
      name: "Researcher",
      email: "user@test.com",
      password: "Password123",
      confirmPassword: "DifferentPassword123",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toBe("Passwords do not match");
    }
  });

  it("rejects short passwords or passwords without numbers", () => {
    const tooShort = SignUpSchema.safeParse({
      name: "User",
      email: "user@test.com",
      password: "pass1",
      confirmPassword: "pass1",
    });
    expect(tooShort.success).toBe(false);

    const noNumber = SignUpSchema.safeParse({
      name: "User",
      email: "user@test.com",
      password: "passwordwithoutnumbers",
      confirmPassword: "passwordwithoutnumbers",
    });
    expect(noNumber.success).toBe(false);
  });
});
