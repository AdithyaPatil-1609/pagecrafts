import type { SupabaseClient } from "@supabase/supabase-js";

// A stand-in for the Supabase client, so contract tests can drive the real route handlers.
//
// The point is not to reimplement Postgres. It is to make the two answers that matter to
// the contract reproducible without a database:
//
//   - a row exists  -> the route's success envelope
//   - no row is visible -> the route's not_found, which is exactly what RLS produces for
//     someone else's project. RLS does not raise; it returns nothing, and the whole
//     owner-scoping guarantee rests on routes reading "nothing" as not_found (SEC-14).
//
// Tests declare what each table answers with; anything they do not declare answers with no
// rows, so forgetting to set a table up shows as not_found rather than as a pass.

export interface Query {
    table: string;
    op: "select" | "insert" | "update" | "upsert" | "delete";
    filters: Record<string, unknown>;
    payload?: unknown;
    /** How the caller finished the chain — `many` is a bare await. */
    shape: "single" | "maybeSingle" | "many";
}

export type TableResponder = (query: Query) => { data: unknown; error: { message: string } | null };

/** Answer every read of this table with one row (and echo writes back). */
export function row(value: unknown): TableResponder {
    return (query) => ({
        data: query.shape === "many" ? [value] : value,
        error: null,
    });
}

/** Answer with a list; a single-row finisher gets the first, or null when empty. */
export function rows(values: unknown[]): TableResponder {
    return (query) => ({
        data: query.shape === "many" ? values : (values[0] ?? null),
        error: null,
    });
}

/** No visible rows — a missing record, or someone else's, which RLS renders identically. */
export const none: TableResponder = (query) => ({
    data: query.shape === "many" ? [] : null,
    error: null,
});

/** The database refused: a constraint, a trigger, a dead connection. */
export function dbError(message: string): TableResponder {
    return () => ({ data: null, error: { message } });
}

/** One supabase.rpc() call, as the handler made it. */
export interface RpcCall {
    name: string;
    args: Record<string, unknown>;
}

export type RpcResponder = (
    args: Record<string, unknown>,
) => { data: unknown; error: { message: string } | null };

export interface FakeSupabase {
    client: SupabaseClient;
    /** Every query the handler made, in order — enough to assert what was written. */
    queries: Query[];
    /** Every database function the handler called, in order, with its arguments. */
    rpcs: RpcCall[];
}

/**
 * `functions` declares the database functions this test expects to be called, the same way
 * `tables` declares its tables. A function a test has not declared answers with an error
 * rather than a plausible success, so a route that starts calling one shows up as a
 * failure here instead of passing on a fake that quietly said yes.
 */
export function fakeSupabase(
    tables: Record<string, TableResponder>,
    functions: Record<string, RpcResponder> = {},
): FakeSupabase {
    const queries: Query[] = [];
    const rpcs: RpcCall[] = [];

    const rpc = async (name: string, args: Record<string, unknown>) => {
        rpcs.push({ name, args });
        const responder = functions[name];

        return responder
            ? responder(args)
            : { data: null, error: { message: `unknown function ${name}` } };
    };

    const from = (table: string) => {
        const query: Query = { table, op: "select", filters: {}, shape: "many" };

        const answer = (shape: Query["shape"]) => {
            query.shape = shape;
            queries.push({ ...query, filters: { ...query.filters } });
            return (tables[table] ?? none)(query);
        };

        // Every builder method returns the builder; only the finishers resolve. The real
        // client is thenable, so a bare `await` has to work too.
        const builder: Record<string, unknown> = {
            select: () => builder,
            insert: (payload: unknown) => ((query.op = "insert"), (query.payload = payload), builder),
            update: (payload: unknown) => ((query.op = "update"), (query.payload = payload), builder),
            upsert: (payload: unknown) => ((query.op = "upsert"), (query.payload = payload), builder),
            delete: () => ((query.op = "delete"), builder),
            eq: (column: string, value: unknown) => ((query.filters[column] = value), builder),
            neq: () => builder,
            in: () => builder,
            not: () => builder,
            order: () => builder,
            limit: () => builder,
            single: () => Promise.resolve(answer("single")),
            maybeSingle: () => Promise.resolve(answer("maybeSingle")),
            then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
                Promise.resolve(answer("many")).then(resolve, reject),
        };

        return builder;
    };

    return {
        client: { from, rpc } as unknown as SupabaseClient,
        queries,
        rpcs,
    };
}
