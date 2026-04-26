export class Result<E, T> {
  public isSuccess: boolean;
  private error: E;
  private value: T;

  private constructor(isSuccess: boolean, error: E, value: T) {
    this.value = value;
    this.error = error;
    this.isSuccess = isSuccess;
  }

  public static ok<F>(value: F): Result<never, F> {
    return new Result<never, F>(true, undefined as never, value);
  }

  public static fail<F>(error: F): Result<F, never> {
    return new Result<F, never>(false, error, undefined as never);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error(
        "Invalid Operation: Can't get value from a failed result"
      );
    }
    return this.value as T;
  }

  public getError(): E {
    if (this.isSuccess) {
      throw new Error(
        "Invalid Operation: Can't get error from a success result"
      );
    }
    return this.error as E;
  }
}
