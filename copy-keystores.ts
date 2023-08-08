import { Command } from "cliffy/command/mod.ts";
import { walk } from "std/fs/walk.ts";
import * as paths from "std/path/mod.ts";
import { error, log, parseYaml, removeAttrFromObject } from "./utils.ts";
import { z } from "zod/mod.ts";
import { pluckValues } from "./pluck.ts";

const yamlMapping = z.record(z.string());

function loadConfig(path: string) {
  return parseYaml(path, yamlMapping);
}

function copyKeystoreCmd(
  source: string,
  podName: string,
  destPath: string
): [Deno.Command, string] {
  return [
    new Deno.Command("kubectl", {
      args: ["cp", source, `${podName}:${destPath}`],
    }),
    `kubectl cp ${source} ${podName}:${destPath}`,
  ];
}

type Config = {
  inputKeystores: string;
  outputChains: string;
  mapping?: Record<string, string>;
  chainSpec: string;
  dryRun: boolean;
};

async function copyKeystores({
  inputKeystores,
  outputChains,
  mapping,
  chainSpec,
  dryRun,
}: Config) {
  const nodeKeystores = walk(inputKeystores, {
    includeDirs: false,
  });
  const want = {
    id: undefined,
  };
  await pluckValues(chainSpec, want);
  const chainId = z.string().parse(want.id);

  for await (const nodeKeystore of nodeKeystores) {
    const parts = nodeKeystore.path.split(paths.SEP_PATTERN);
    const basename = paths.basename(nodeKeystore.path);
    const nodeName = parts[1];
    if (mapping && !(nodeName in mapping)) {
      throw new Error(`No mapping for node ${nodeName}`);
    }
    const podName = mapping === undefined ? nodeName : mapping[nodeName];
    const source = nodeKeystore.path;
    const destPath = paths.join(outputChains, chainId, "keystore", basename);
    const [_cmd, cmdString] = copyKeystoreCmd(source, podName, destPath);
    log(`running ${cmdString}`, "primary");
    if (dryRun) {
      continue;
    }
    const output = await _cmd.output();
    if (output.success) {
      log(`successfully copied keyfile to pod ${podName}`);
    } else {
      error(`failed to copy keyfile to pod ${podName}: ${output.stderr}`);
    }
  }
}

export const copyKeystoresCmd = new Command()
  .option("-d --dry-run", "don't execute commands", {
    default: false,
  })
  .option("-k --keystores <inputKeystores>", "path to keystore directory", {
    required: true,
  })
  .option("-c --chain-spec <chainSpec>", "path to chain spec", {
    required: true,
  })
  .option(
    "-o --output-chains <outputChains>",
    "base path to chain data on the k8s pods. this is the root of where the keystores will be copied to",
    {
      default: "/data/chains/",
    }
  )
  .option(
    "-m --mapping <mappingFilePath>",
    "path to a yaml file that maps node names to pod names. if not provided, the node names will be used as pod names"
  )
  .action(async (options) => {
    let mapping;
    if (options.mapping) {
      mapping = await loadConfig(options.mapping);
    }
    const optionsMinusMapping: Omit<typeof options, "mapping"> =
      removeAttrFromObject(options, "mapping");
    await copyKeystores({
      inputKeystores: options.keystores,
      mapping,
      ...optionsMinusMapping,
    });
  });
