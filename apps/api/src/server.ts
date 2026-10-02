import { app } from "./app.js";
import { env } from "./config/env.js";

const PORT = env.PORT;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`V-Lab ECE API server running on port ${PORT}`);
});
