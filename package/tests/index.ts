import { registerSuite } from './runner';
import { inventorySuite } from './inventory.tests';
import { orderSuite } from './order.tests';
import { sharedSuite } from './shared.tests';

registerSuite(inventorySuite);
registerSuite(orderSuite);
registerSuite(sharedSuite);
