import { Client, Connection, type ConnectionOptions } from "@temporalio/client";

export async function connectFoundationClient(
  options: ConnectionOptions & { identity: string },
) {
  if (!options.identity) throw new Error("TEMPORAL_CLIENT_IDENTITY_REQUIRED");
  const connection = await Connection.connect(options);
  return {
    client: new Client({ connection, namespace: "default" }),
    connection,
  };
}
