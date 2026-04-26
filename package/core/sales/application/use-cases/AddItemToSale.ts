import type { HandleStockPort } from "../ports/HandleStockPort";
import type { SaleRepository } from "../../domain/SaleRepository";
import type { GetProductsInfo } from "../ports/GetProductsInfo";
import { Result } from "../../../shared/domain/Result";
import { SaleNotFoundError } from "../../domain/Errors/SaleNotFoundError";

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

    // Pre-check sin mutar: si no es DRAFT, evitar reservar stock.
    const canAddItemResult = sale.canAddItem();
    if (!canAddItemResult.isSuccess) {
      return Result.fail(canAddItemResult.getError());
    }

    const reserveStockResult = await this.handleStock.reserveStock(
      props.itemId,
      props.quantity
    );
    if (!reserveStockResult.isSuccess) {
      return Result.fail(reserveStockResult.getError());
    }

    // Compensación reutilizable: libera el stock reservado y loguea si la liberación falla.
    const releaseReservedStock = async () => {
      const releaseResult = await this.handleStock.releaseStock(
        props.itemId,
        props.quantity
      );
      if (!releaseResult.isSuccess) {
        console.error(
          `[AddItemToSale] failed to release reserved stock for ${props.itemId}:`,
          releaseResult.getError()
        );
      }
    };

    const productInfoResult = await this.getProductInfo.execute([props.itemId]);
    if (!productInfoResult.isSuccess) {
      await releaseReservedStock();
      return Result.fail(productInfoResult.getError());
    }

    const productInfo = productInfoResult.getValue()![0];
    const addItemResult = sale.addItem({
      productId: props.itemId,
      nameSnapshot: productInfo.name,
      quantity: props.quantity,
      priceSnapshot: productInfo.price,
    });
    if (!addItemResult.isSuccess) {
      await releaseReservedStock();
      return Result.fail(addItemResult.getError());
    }

    const updateResult = await this.saleRepository.update(sale);
    if (!updateResult.isSuccess) {
      await releaseReservedStock();
      return Result.fail(updateResult.getError());
    }

    return Result.ok(sale);
  }
}
