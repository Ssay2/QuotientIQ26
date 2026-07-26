import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`QuotientIQ API listening on http://localhost:${port}`);
  console.log(`  Health: GET http://localhost:${port}/api/health`);
  console.log(`  Workflows: GET http://localhost:${port}/api/workflows`);
  console.log(`  Marketplace: GET http://localhost:${port}/api/marketplace/workflows`);
});
