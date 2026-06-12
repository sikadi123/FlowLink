import { createFlowLinkServer } from "./src/server/app.js";
import { config } from "./src/server/config.js";

const server = createFlowLinkServer();

server.listen(config.port, () => {
  console.log(`FlowLink demo running at http://localhost:${config.port}`);
  console.log("Demo accounts: linche / flowlink123, shenyan / flowlink123");
});
