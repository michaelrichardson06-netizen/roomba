import { Router, type IRouter, type Request } from "express";
import { createHash } from "crypto";
import { pool } from "../lib/db.js";

const router: IRouter = Router();

function hashIp(ip: string): string {
  return createHash("sha256").update(ip + "roomba-salt-2025").digest("hex").slice(0, 32);
}

function getIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return first.trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "Anonymous";
  return raw.trim().replace(/[^a-zA-Z0-9 _\-!?.]/g, "").slice(0, 20) || "Anonymous";
}

router.get("/leaderboard", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT name, score, wave, insects_killed, created_at
       FROM leaderboard
       ORDER BY score DESC
       LIMIT 100`
    );
    res.json({ ok: true, entries: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: "db error" });
  }
});

router.post("/leaderboard", async (req, res) => {
  try {
    const name = sanitizeName(req.body?.name);
    const score = Number(req.body?.score) || 0;
    const wave = Number(req.body?.wave) || 1;
    const insects_killed = Number(req.body?.insects_killed) || 0;
    const ip_hash = hashIp(getIp(req));

    await pool.query(
      `INSERT INTO leaderboard (name, ip_hash, score, wave, insects_killed)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, ip_hash, score, wave, insects_killed]
    );

    const { rows } = await pool.query(
      `SELECT COUNT(*)+1 AS rank FROM leaderboard WHERE score > $1`,
      [score]
    );

    res.json({ ok: true, rank: Number(rows[0].rank) });
  } catch (err) {
    res.status(500).json({ ok: false, error: "db error" });
  }
});

export default router;
