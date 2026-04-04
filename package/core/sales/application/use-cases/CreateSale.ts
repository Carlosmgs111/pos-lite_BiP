import type { SaleRepository } from "../../domain/SaleRepository";
import { Sale } from "../../domain/Sale";
import type { GetProductsInfo } from "../ports/GetProductsInfo";
import { Result } from "../../../shared/domain/Result";

interface CreateSaleProps {
  id: string;
  itemIds: string[];
  createdAt: Date;
}

export class CreateSale {
  constructor(
    private saleRepository: SaleRepository,
    private getProductsInfo: GetProductsInfo
  ) {}
  async execute(props: CreateSaleProps) {
    const salesExist = await this.saleRepository.getSaleById(props.id);
    if (salesExist.isSuccess && salesExist.getValue()) {
      return Result.fail(new Error("Sale with id " + props.id + " already exists"));
    }
    const saleItems = await this.getProductsInfo.execute(props.itemIds);
    if (!saleItems.isSuccess) {
      return Result.fail(saleItems.getError());
    }
    const saleItemsProps = saleItems.getValue()!.map((item) => ({
      id: props.id,
      productName: item.name,
      quantity: 1,
      price: item.price,
      total: item.price * 1,
    }));

    const saleResult = Sale.create({
      id: props.id,
      items: saleItemsProps,
      createdAt: props.createdAt,
    });
    if (!saleResult.isSuccess) {
      return Result.fail(saleResult.getError());
    }
    return this.saleRepository.save(saleResult.getValue()!);
  }
}
