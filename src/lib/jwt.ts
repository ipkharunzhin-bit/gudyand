import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export function signToken(payload: { userId: string; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
}

export function getUserIdFromRequest(request: Request): string {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  return decoded.userId;
}