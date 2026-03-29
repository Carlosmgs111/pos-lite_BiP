import type { Suite, TestResult } from "./runner";
import { PriceVO } from "../core/shared/domain/Price.VO";

function result(name: string, passed: boolean, message?: string): TestResult {
  return {
    name,
    suite: "inventory",
    passed,
    message: passed ? undefined : message,
  };
}

export const sharedSuite: Suite = {
  name: "shared",
  tests: [
    async () => {
      const price = new PriceVO(10);
      return result(
        "Price Value Object: Setting price as int (10) should be 1000",
        price.getValue() === 1000
      );
    },
    async () => {
      const price = new PriceVO(10.0);
      return result(
        "Price Value Object: Setting price as float (10.0) with one decimal should be 1000",
        price.getValue() === 1000
      );
    },
    async () => {
      const price = new PriceVO(10.01);
      return result(
        "Price Value Object: Setting price as float (10.01) with two decimals should be 1001",
        price.getValue() === 1001
      );
    },
    async () => {
      try {
        new PriceVO(-10);
      } catch (error) {
        console.log({ error });
        return result(
          "Price Value Object: Setting price with negative value (-10) in construction should throw error",
          error instanceof Error
        );
      }
      return result(
        "Price Value Object: Setting price with negative value (-10) in construction should throw error",
        false
      );
    },
  ],
};
