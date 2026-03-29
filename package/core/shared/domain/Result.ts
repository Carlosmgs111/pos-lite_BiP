export class Result<E, T> {
  public isSuccess: boolean;
  private error?: E;
  private value?: T;

  private constructor(isSuccess: boolean, error?: E, value?: T) {
    this.value = value;
    this.error = error;
    this.isSuccess = isSuccess;
  }

  public static ok<F, U>(value?: U): Result<F, U> {
    return new Result<F, U>(true, undefined, value);
  }

  public static fail<F, U>(error?: F): Result<F, U> {
    return new Result<F, U>(false, error);
  }

  public getValue() {
    if (!this.isSuccess) {
      throw new Error("Invalid Operation: Can't get value from a failed result");
    }
    return this.value;
  }

  public getError() {
    if (this.isSuccess) {
      throw new Error("Invalid Operation: Can't get error from a success result");
    }
    return this.error;
  }
}
