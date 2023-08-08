import { JSONbig, convertExponentials, error } from "./utils.ts";

export async function readAndParseChainSpec(specPath: string) {
  const rawdata = await Deno.readTextFile(specPath);
  let chainSpec;
  try {
    chainSpec = JSONbig.parse(rawdata);
    return chainSpec;
  } catch {
    error(`failed to parse the chain spec`);
    Deno.exit(1);
  }
}

// deno-lint-ignore no-explicit-any
export type Chainspec = any;

export async function writeChainSpec(specPath: string, chainSpec: Chainspec) {
  try {
    const data = JSONbig.stringify(chainSpec, null, 2);
    await Deno.writeFile(
      specPath,
      new TextEncoder().encode(convertExponentials(data))
    );
  } catch (e) {
    error(
      `\n\t\t  "  ⚠ failed to write the chain spec with path: ")
        )} ${specPath} ${e}`
    );
    Deno.exit(1);
  }
}
