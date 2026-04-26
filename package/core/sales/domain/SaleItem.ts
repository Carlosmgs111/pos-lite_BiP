import { PriceVO } from "../../shared/domain/Price.VO";
import { Result } from "../../shared/domain/Result";
import { InvalidQuantityError } from "./Errors/InvalidQuantityError";

// * 🔎 [AUDIT-16] LOW · SaleItemProps.subTotal es campo muerto
// ! Problem: el constructor nunca usa props.subTotal — siempre recalcula
// !   `PriceVO.multiply(price, quantity)` (líneas 27-28). El campo en la interfaz es ruido y
// !   permite a callers pasar valores inconsistentes (`subTotal: 999`) que se ignoran silenciosamente.
// !   Esto ya causó el bug histórico de doble conversión (cents → cents).
// ? Solution: eliminar `subTotal: number` de SaleItemProps. Actualizar todos los callers
// ?   (CreateSale.ts, AddItemToSale.ts) para no pasarlo.
export interface SaleItemProps {
  productId: string;
  nameSnapshot: string;
  quantity: number;
  priceSnapshot: number;
}
export class SaleItem {
  private constructor(
    private productId: string,
    private nameSnapshot: string,
    private quantity: number,
    private priceSnapshot: PriceVO,
    private subTotal: PriceVO
  ) {}

  static create(props: SaleItemProps): Result<InvalidQuantityError, SaleItem> {
    if (props.quantity <= 0) {
      return Result.fail(
        new InvalidQuantityError("Quantity must be greater than 0")
      );
    }
    const price = new PriceVO(props.priceSnapshot);
    const subTotal = PriceVO.multiply(price, props.quantity);
    return Result.ok(
      new SaleItem(
        props.productId,
        props.nameSnapshot,
        props.quantity,
        price,
        subTotal
      )
    );
  }

  getProductId() {
    return this.productId;
  }
  getNameSnapshot() {
    return this.nameSnapshot;
  }
  getPriceSnapshot() {
    return this.priceSnapshot;
  }

  // * 🔎 [AUDIT-14] MED · incrementQuantity sin validar el delta
  // ! Problem: acepta cualquier `quantity` (0, negativo, NaN). Negativo decrementa sin pasar
  // !   por la guarda de decrementQuantity, permitiendo `this.quantity` negativo y subTotal
  // !   inválido. 0 es no-op silencioso. La firma `void` impide que el caller detecte el caso.
  // ? Solution: validar `quantity > 0` y devolver `Result<InvalidQuantityError, void>`,
  // ?   simétrico a decrementQuantity.
  incrementQuantity(quantity: number) {
    if (quantity <= 0) {
      return Result.fail(
        new InvalidQuantityError("Quantity must be greater than 0")
      );
    }
    this.quantity += quantity;
    this.subTotal = PriceVO.multiply(this.priceSnapshot, this.quantity);
    return Result.ok(undefined);
  }

  // * 🔎 [AUDIT-15-START] MED · decrementQuantity permite quantity == 0 (item zombie)
  // ! Problem: la guarda es `newQuantity < 0`, así que `newQuantity === 0` se acepta y deja
  // !   un SaleItem con quantity=0 y subTotal=0 dentro del agregado. Sale.removeItem compensa
  // !   con `<= 0` (Sale.ts:131) eliminando el item, pero si decrementQuantity se llama desde
  // !   otro path (futuro use case, tests directos), el item zombie persiste y rompe sumas y
  // !   findItemById.
  // ? Solution: cambiar guarda a `newQuantity <= 0` y devolver error ("use removeItem to
  // ?   eliminate"), o hacer decrementQuantity privado y obligar a pasar por Sale.removeItem.
  decrementQuantity(quantity: number): Result<InvalidQuantityError, void> {
    const newQuantity = this.quantity - quantity;
    if (newQuantity <= 0) {
      return Result.fail(
        new InvalidQuantityError("Resulting quantity cannot be negative")
      );
    }
    this.quantity = newQuantity;
    this.subTotal = PriceVO.multiply(this.priceSnapshot, this.quantity);
    return Result.ok(undefined);
  }
  // 🔎 [AUDIT-15-END]

  getSubTotal() {
    return this.subTotal;
  }
  getQuantity() {
    return this.quantity;
  }
  serialize() {
    return {
      productId: this.productId,
      nameSnapshot: this.nameSnapshot,
      quantity: this.quantity,
      priceSnapshot: this.priceSnapshot.getValue(),
      subTotal: this.subTotal.getValue(),
    };
  }
}
