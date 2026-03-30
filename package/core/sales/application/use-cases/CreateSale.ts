import type { SaleRepository } from "../../domain/SaleRepository";
import { Sale } from "../../domain/Sale";
import { SaleItem } from "../../domain/SaleItem";
import { PriceVO } from "../../../shared/domain/Price.VO";

interface CreateSaleProps {
  id: string;
  items: SaleItem[];
  total: PriceVO;
  createdAt: Date;
}

export class CreateSale {
  constructor(private saleRepository: SaleRepository) {}
  execute(props: CreateSaleProps) {
    this.saleRepository.registry(Sale.create(props));
  }
}
