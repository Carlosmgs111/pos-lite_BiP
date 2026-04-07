import "../../core/payment"
import { registerSuite } from "../runner";
import { saleSuite } from "./sales.tests";
import { paymentSuite } from "./payment.tests";

registerSuite(saleSuite);
registerSuite(paymentSuite);
