import "dotenv/config";
import mongoose from "mongoose";

import { UserModel } from "../src/modules/users";

async function main() {
  const email = process.argv[2] ?? process.env.SUPER_ADMIN_EMAIL;
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }

  if (!email) {
    console.error("Provide an email or set SUPER_ADMIN_EMAIL.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  const result = await UserModel.updateOne(
    { email: email.toLowerCase() },
    { $set: { twoFactorSecret: null, twoFactorEnabled: false } }
  );

  if (result.matchedCount === 0) {
    console.error(`No user found for ${email}.`);
  } else {
    console.log(
      `Reset 2FA for ${email}. matched=${result.matchedCount} modified=${result.modifiedCount}`
    );
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Failed to reset 2FA:", error);
  process.exit(1);
});
