const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class UuidVO {
  private readonly value: string;

  constructor(uuid: string) {
    this.validate(uuid);
    this.value = uuid.toLowerCase();
  }

  static generate(): UuidVO {
    return new UuidVO(crypto.randomUUID());
  }

  private validate(uuid: string): void {
    if (!uuid) {
      throw new Error("UUID cannot be empty");
    }
    if (!UUID_REGEX.test(uuid)) {
      throw new Error("Invalid UUID format");
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: UuidVO): boolean {
    return this.value === other.getValue();
  }
}
