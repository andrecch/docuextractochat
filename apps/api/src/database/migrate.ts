import { createDataSource } from "./data-source";
async function run() {
  const db = createDataSource();
  await db.initialize();
  try {
    await db.runMigrations({ transaction: "all" });
  } finally {
    await db.destroy();
  }
}
run().catch(() => {
  console.error("Database migration failed. Check database configuration.");
  process.exitCode = 1;
});
