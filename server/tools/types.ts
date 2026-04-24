

// Standard format for tools
export type ToolContext = {
  uid: string;               // from Firebase auth
  requestId: string;         // for logging/idempotency
};

export type ToolDef<TArgs, TResult> = {
  name: string;
  description: string;
  parameters: Record<string, any>; 
  handler: (args: TArgs, ctx: ToolContext) => Promise<TResult>;
};