import jwt from "jsonwebtoken";

export function checkToken(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT secret");
  }

  jwt.verify(token, secret);
}
