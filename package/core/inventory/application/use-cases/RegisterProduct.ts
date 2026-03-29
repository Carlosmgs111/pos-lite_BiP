import { Product } from "../../domain/Product";
import type { ProductRepository } from "../../domain/ProductRepository";
import { NameVO } from "../../domain/Name.VO";
import { PriceVO } from "../../../shared/domain/Price.VO";
import { UuidVO } from "../../../shared/domain/Uuid.VO";

type RegisterProductProps = {
  id: string;
  name: string;
  price: number;
  stock: number;
  reservedStock: number;
};

export class RegisterProduct {
  constructor(private productRepository: ProductRepository) {}
  execute(productProps: RegisterProductProps) {
    const product = new Product(
      new UuidVO(productProps.id),
      new NameVO(productProps.name),
      new PriceVO(productProps.price),
      productProps.stock,
      productProps.reservedStock
    );

    this.productRepository.registry(product);
  }
}
