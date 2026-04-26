import type { HandleStockPort } from "../ports/HandleStockPort";
import type { SaleRepository } from "../../domain/SaleRepository";
import type { GetProductsInfo } from "../ports/GetProductsInfo";
import { Result } from "../../../shared/domain/Result";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";
import { InvalidSaleStateError } from "../../domain/Errors/InvalidSaleStateError";
import { SaleStatus } from "../../domain/SaleStatus";

interface AddItemToSaleProps {
  saleId: string;
  itemId: string;
  quantity: number;
}

export class AddItemToSale {
  constructor(
    private handleStock: HandleStockPort,
    private saleRepository: SaleRepository,
    private getProductInfo: GetProductsInfo
  ) {}
  async execute(props: AddItemToSaleProps) {
    const saleResult = await this.saleRepository.getSaleById(props.saleId);
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    if (!saleResult.getValue()) {
      return Result.fail(new SaleNotFoundError());
    }
    const sale = saleResult.getValue()!;
    // * 🔎 [AUDIT-21] LOW · check de status DRAFT duplicado (defensivo pero redundante)
    // ! Problem: la guarda `getStatus() !== DRAFT` también vive en sale.addItem (Sale.ts:101).
    // !   Mantener ambas evita reservar stock si la venta no es DRAFT, pero duplica la regla.
    // ?   Si solo dejas la del agregado, el rollback de stock falla silenciosamente (releaseStock
    // ?   en línea 42 ignora Result — ver AUDIT-22).
    // ? Solution: mover a un método `sale.canAddItem(): Result<...>` y llamarlo aquí (sin mutar)
    // ?   antes de reservar. addItem internamente vuelve a chequear (defense in depth) y se
    // ?   elimina la duplicación efectiva.
    if (sale.getStatus() !== SaleStatus.DRAFT) {
      return Result.fail(new InvalidSaleStateError("Can only add items to a draft sale"));
    }
    // * 🔎 [AUDIT-22-START] HIGH · 3 Results ignorados en cadena de mutación
    // ! Problem: (1) `releaseStock` en el rollback de productInfo (línea 42) ignora isSuccess;
    // !   si el rollback falla, el stock queda reservado huérfano. (2) `sale.addItem(...)`
    // !   retorna `Result<Error, void>` y se invoca como void; si falla por race (status cambió
    // !   entre línea 30 y línea 47), el stock se reservó y no se libera. (3) `saleRepository.update`
    // !   se ignora; si falla, la venta en repo no refleja el item agregado pero el stock SÍ
    // !   se reservó.
    // ? Solution: capturar cada Result. En (2) y (3), liberar el stock reservado y propagar el
    // ?   fail. En (1), al menos loguear el rollback fallido (es best-effort en este path).
    const reserveStockResult = await this.handleStock.reserveStock(
      props.itemId,
      props.quantity
    );
    if (!reserveStockResult.isSuccess) {
      return Result.fail(reserveStockResult.getError());
    }
    const productInfoResult = await this.getProductInfo.execute([props.itemId]);
    if (!productInfoResult.isSuccess) {
      await this.handleStock.releaseStock(props.itemId, props.quantity);
      return Result.fail(productInfoResult.getError());
    }
    const productInfo = productInfoResult.getValue()![0];
    sale.addItem({
      productId: props.itemId,
      nameSnapshot: productInfo.name,
      quantity: props.quantity,
      priceSnapshot: productInfo.price,
    });
    await this.saleRepository.update(sale);
    return Result.ok(sale);
    // 🔎 [AUDIT-22-END]
  }
}
