import type { SaleRepository } from "../../domain/SaleRepository";
import type { HandleStockPort } from "../ports/HandleStockPort";
import { Result } from "../../../shared/domain/Result";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";

export class FailSale {
  constructor(
    private saleRepository: SaleRepository,
    private handleStock: HandleStockPort
  ) {}
  async execute(saleId: string): Promise<Result<Error, void>> {
    const saleResult = await this.saleRepository.getSaleById(saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    if (!saleResult.getValue()) {
      return Result.fail(new SaleNotFoundError());
    }
    const sale = saleResult.getValue()!;
    const failResult = sale.failSale();
    if (!failResult.isSuccess) {
      return Result.fail(failResult.getError());
    }
    // * 🔎 [AUDIT-23-START] MED · sin compensación si restoreStock falla a media iteración
    // ! Problem: si el bucle restaura stock para items 0..N-1 y falla en el ítem N, retornamos
    // !   fail pero los items previos ya consumieron `restoreStock` (stock += quantity).
    // !   Además, `sale.failSale()` ya marcó el agregado como CANCELLED en memoria pero NO se
    // !   persiste (saleRepository.update solo se invoca al final). Resultado: stock desbalanceado
    // !   + venta in-memory CANCELLED pero en repo aún READY_TO_PAY → próximo retry duplica el
    // !   restore.
    // ? Solution: o (a) acumular items restaurados y revertirlos en error (simétrico al
    // ?   patrón de RegisterSale + revertCommitStock), o (b) persistir CANCELLED primero
    // ?   (failSale + update) y luego restaurar stock como tarea idempotente best-effort
    // ?   con logging del error.
    for (const item of sale.getItems()) {
      const restoreResult = await this.handleStock.restoreStock(
        item.getProductId(),
        item.getQuantity()
      );
      if (!restoreResult.isSuccess) {
        return Result.fail(restoreResult.getError());
      }
    }
    return this.saleRepository.update(sale);
    // 🔎 [AUDIT-23-END]
  }
}
