import { registerSuite } from '../runner';
import { inventorySuite } from './inventory.tests';
import { saleSuite } from './sales.tests';
import { sharedSuite } from './shared.tests';

registerSuite(inventorySuite);
registerSuite(saleSuite);
registerSuite(sharedSuite);
