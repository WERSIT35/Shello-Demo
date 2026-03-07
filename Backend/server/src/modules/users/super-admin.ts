import { env } from "../../config/env";
import { hashPassword } from "../../utils/hash";
import { logger } from "../../utils/logger";
import { UserModel } from "./user.model";

const SUPER_ADMIN = {
  name: env.SUPER_ADMIN_NAME ?? "Shello",
  lastName: env.SUPER_ADMIN_LAST_NAME ?? "Admin",
  email: env.SUPER_ADMIN_EMAIL,
  password: env.SUPER_ADMIN_PASSWORD,
  pinCode: env.SUPER_ADMIN_PIN_CODE,
  role: "admin" as const
};

export async function ensureSuperAdmin(): Promise<void> {
  if (!SUPER_ADMIN.email || !SUPER_ADMIN.password || !SUPER_ADMIN.pinCode) {
    logger.warn(
      "Super admin not configured. Set SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_PIN_CODE."
    );
    return;
  }

  const normalizedEmail = SUPER_ADMIN.email.toLowerCase();
  const passwordHash = await hashPassword(SUPER_ADMIN.password);

  const existing = await UserModel.findOne({ email: normalizedEmail }).lean();

  if (existing) {
    const pinCodeInUse = await UserModel.exists({
      pinCode: SUPER_ADMIN.pinCode,
      _id: { $ne: existing._id }
    });

    if (pinCodeInUse) {
      logger.warn("Super admin pin code already in use. Update SUPER_ADMIN_PIN_CODE.");
    }

    await UserModel.updateOne(
      { _id: existing._id },
      {
        $set: {
          name: SUPER_ADMIN.name,
          lastName: SUPER_ADMIN.lastName,
          email: normalizedEmail,
          password: passwordHash,
          role: SUPER_ADMIN.role,
          ...(pinCodeInUse ? {} : { pinCode: SUPER_ADMIN.pinCode })
        }
      }
    );

    logger.info("Super admin updated");
    return;
  }

  const pinExists = await UserModel.exists({ pinCode: SUPER_ADMIN.pinCode });

  if (pinExists) {
    logger.warn("Super admin pin code already in use. Update SUPER_ADMIN_PIN_CODE.");
    return;
  }

  await UserModel.create({
    name: SUPER_ADMIN.name,
    lastName: SUPER_ADMIN.lastName,
    email: normalizedEmail,
    password: passwordHash,
    pinCode: SUPER_ADMIN.pinCode,
    role: SUPER_ADMIN.role
  });

  logger.info("Super admin created");
}
