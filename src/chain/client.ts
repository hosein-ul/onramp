import { createThruClient, type Thru } from "@thru/sdk/client";
import { NETWORK } from "../config";

let client: Thru | null = null;

/** One shared read-only gRPC-Web client. No keys, no state. */
export function chain(): Thru {
  client ??= createThruClient({ baseUrl: NETWORK.rpcUrl });
  return client;
}
