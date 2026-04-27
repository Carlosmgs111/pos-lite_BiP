export class PartialProductsFoundError extends Error {
    constructor() {
        super("Partial products found");
    }
}