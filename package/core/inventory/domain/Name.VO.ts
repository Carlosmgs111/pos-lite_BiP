export class NameVO {
    constructor(public readonly name: string) {
        this.validate(name);
    }

    private validate(name: string): void {
        if (!name) {
            throw new Error("Name cannot be empty");
        }
        if (name.length < 3) {
            throw new Error("Name must be at least 3 characters long");
        }
    }
    getValue(): string {
        return this.name;
    }
}