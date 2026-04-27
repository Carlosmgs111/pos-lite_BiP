export class NameVO {
    constructor(public readonly name: string) {
        this.validate(name);
    }

  private validate(name: string): void {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Name cannot be empty");
    }
    if (trimmedName.length < 3) {
      throw new Error("Name must be at least 3 characters long");
    }
    if (trimmedName.length > 100) {
      throw new Error("Name must be at most 100 characters long");
    }
  }
    getValue(): string {
        return this.name;
    }
}