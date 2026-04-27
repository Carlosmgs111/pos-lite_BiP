import "../../core/payment"
import { registerSuite } from "../runner";
import { aggregateSeparationSuite } from "./aggregate-separation.tests";
import { gatewayIntegrationSuite } from "./gateway-integration.tests";
import { sseRoutingSuite } from "./sse-routing.tests";

registerSuite(aggregateSeparationSuite);
registerSuite(gatewayIntegrationSuite);
registerSuite(sseRoutingSuite);
