// Acepta UUID v1-v9 (cubre versiones actuales y futuras inmediatas). Nil UUID
// (00000000-...) sigue rechazado intencionalmente: no debería usarse como identificador
// de dominio. Variant nibble [89ab] mantiene la restricción de RFC 4122.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class UuidVO {
  private readonly value: string;

  constructor(uuid: string) {
    this.validate(uuid);
    this.value = uuid.toLowerCase();
  }

  static generate(): string {
    return crypto.randomUUID();
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
