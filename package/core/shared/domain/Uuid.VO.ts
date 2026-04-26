// * 🔎 [AUDIT-24-START] LOW · regex case-insensitive pero version range estricto (1-7)
// ! Problem: (1) `[1-7]` para el dígito de versión rechaza UUIDs v8/v9 (existen en futuras specs);
// !   más importante, rechaza el UUID nil "00000000-0000-0000-0000-000000000000" que algunos
// !   tests/seeds usan. Si el test failing `Invalid UUID format` en starting-sales pasa un nil
// !   o un v0, esta es la causa. (2) Regex con /i + value almacenado en lowercase: aceptas
// !   "AAAA-..." pero almacenas "aaaa-..." — comportamiento correcto pero asimétrico (validas
// !   amplio, normalizas estrecho). Funciona, pero confunde al onboarding.
// ? Solution: (1) ampliar versión a `[1-9a-f]` o documentar restricción. Investigar el test
// ?   fallido para confirmar que esta sea la causa. (2) decidir convención: o aceptar solo
// ?   lowercase (regex sin /i) o normalizar en validación, no en construcción.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// 🔎 [AUDIT-24-END]

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
