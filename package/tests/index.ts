import { registerSuite } from './runner';
import { inventorySuite } from './inventory.tests';
import { orderSuite } from './order.tests';

registerSuite(inventorySuite);
registerSuite(orderSuite);
