import type { Result } from "../../shared/domain/Result";
import type { ConfirmStock as ConfirmStockPort } from "../application/ports/ConfirmStock";
import { confirmStock } from "../../inventory";

export class ConfirmStock implements ConfirmStockPort {
  constructor() {}
  async execute(
    itemId: string,
    quantity: number
  ): Promise<Result<Error, void>> {
    return await confirmStock.execute(itemId, quantity);
  }
}
