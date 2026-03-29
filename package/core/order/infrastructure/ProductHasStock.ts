
import { getProduct } from "../../inventory";
import type { ProductHasStock as _ProductHasStock } from "./ProductHasStock";

export class ProductHasStock implements _ProductHasStock {
    constructor() {}
    async execute(productName: string, quantity: number): Promise<boolean> {
        const product = await getProduct.execute(productName);
        return product.stock >= quantity;
    }
}
