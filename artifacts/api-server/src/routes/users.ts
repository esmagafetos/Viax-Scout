import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, usersTable, userSettingsTable } from "@workspace/db";
import { UpdateProfileBody, UpdatePasswordBody, UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Não autenticado." });
    return null;
  }
  return userId;
}

router.patch("/users/profile", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.avatarUrl !== undefined) updateData.avatarUrl = parsed.data.avatarUrl;
  if (parsed.data.birthDate !== undefined) updateData.birthDate = parsed.data.birthDate;

  const [user] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, userId))
    .returning();

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    birthDate: user.birthDate,
    createdAt: user.createdAt.toISOString(),
  });
});

router.post("/users/avatar", avatarUpload.single("avatar"), async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado." });
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(req.file.mimetype)) {
    res.status(400).json({ error: "Formato inválido. Use JPG, PNG, WEBP ou GIF." });
    return;
  }

  const base64 = req.file.buffer.toString("base64");
  const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

  const [user] = await db
    .update(usersTable)
    .set({ avatarUrl: dataUrl })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    birthDate: user.birthDate,
    createdAt: user.createdAt.toISOString(),
  });
});

router.patch("/users/password", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = UpdatePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado." });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Senha atual incorreta." });
    return;
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, userId));

  res.json({ message: "Senha alterada com sucesso." });
});

router.get("/users/settings", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  let [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);

  if (!settings) {
    const [created] = await db.insert(userSettingsTable).values({ userId, parserMode: "builtin", toleranceMeters: 300, instanceMode: "builtin" }).returning();
    settings = created;
  }

  res.json({
    parserMode: settings.parserMode,
    aiProvider: settings.aiProvider,
    aiApiKey: settings.aiApiKey,
    toleranceMeters: settings.toleranceMeters,
    instanceMode: (settings as any).instanceMode ?? "builtin",
    googleMapsApiKey: (settings as any).googleMapsApiKey ?? null,
  });
});

router.patch("/users/settings", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.parserMode !== undefined) updateData.parserMode = parsed.data.parserMode;
  if (parsed.data.aiProvider !== undefined) updateData.aiProvider = parsed.data.aiProvider;
  if (parsed.data.aiApiKey !== undefined) updateData.aiApiKey = parsed.data.aiApiKey;
  if (parsed.data.toleranceMeters !== undefined) updateData.toleranceMeters = parsed.data.toleranceMeters;
  if ((parsed.data as any).instanceMode !== undefined) updateData.instanceMode = (parsed.data as any).instanceMode;
  if ((parsed.data as any).googleMapsApiKey !== undefined) updateData.googleMapsApiKey = (parsed.data as any).googleMapsApiKey;

  let [settings] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);

  if (!settings) {
    const [created] = await db.insert(userSettingsTable).values({ userId, parserMode: "builtin", toleranceMeters: 300, instanceMode: "builtin", ...updateData }).returning();
    settings = created;
  } else {
    const [updated] = await db.update(userSettingsTable).set(updateData).where(eq(userSettingsTable.userId, userId)).returning();
    settings = updated;
  }

  res.json({
    parserMode: settings.parserMode,
    aiProvider: settings.aiProvider,
    aiApiKey: settings.aiApiKey,
    toleranceMeters: settings.toleranceMeters,
    instanceMode: (settings as any).instanceMode ?? "builtin",
    googleMapsApiKey: (settings as any).googleMapsApiKey ?? null,
  });
});

export default router;
