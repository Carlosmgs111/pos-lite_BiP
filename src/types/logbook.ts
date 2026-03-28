export interface AggregateProperty {
  name: string;
  type: string;
}

export interface Invariant {
  rule: string;
  category: 'validation' | 'business' | 'consistency';
}

export interface Aggregate {
  name: string;
  properties: AggregateProperty[];
  invariants: Invariant[];
  methods: string[];
}

export interface ValueObject {
  name: string;
  shared: boolean;
  validations: string[];
}

export interface Port {
  name: string;
  context: string;
  description: string;
  adapter: string;
}

export interface BoundedContext {
  name: string;
  aggregates: Aggregate[];
  valueObjects: ValueObject[];
}

export interface LogbookArtifacts {
  boundedContexts: BoundedContext[];
  sharedValueObjects: ValueObject[];
  ports: Port[];
}

export interface TestSummary {
  passed: number;
  failed: number;
  total: number;
}
