import { Router } from "express";

export const authRouter = Router();

const users: Array<{ id: string; email: string; name: string }> = [];

authRouter.post("/auth/signup", (req, res) => {
  const { email, name } = req.body ?? {};

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const existing = users.find((user) => user.email === email);
  if (existing) {
    res.status(409).json({ error: "User already exists" });
    return;
  }

  const user = {
    id: `user_${Date.now()}`,
    email,
    name: typeof name === "string" ? name : "User"
  };

  users.push(user);

  res.status(201).json({ user });
});

authRouter.post("/auth/login", (req, res) => {
  const { email } = req.body ?? {};

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const user = users.find((entry) => entry.email === email);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user });
});
