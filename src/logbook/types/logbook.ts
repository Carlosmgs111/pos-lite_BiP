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
  kind?: 'aggregate' | 'entity';
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

export interface DomainEvent {
  name: string;
  publisher: string;
  subscriber: string;
  description: string;
}

export interface StateTransition {
  from: string;
  to: string;
  trigger: string;
}

export interface StateMachine {
  entity: string;
  states: string[];
  transitions: StateTransition[];
}

export interface LogbookArtifacts {
  boundedContexts: BoundedContext[];
  sharedValueObjects: ValueObject[];
  ports: Port[];
  domainEvents?: DomainEvent[];
  stateMachines?: StateMachine[];
}

export interface TestSummary {
  passed: number;
  failed: number;
  total: number;
}
