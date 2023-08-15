import { Command } from "cliffy/command/mod.ts";
import { log, makeDir } from "./utils.ts";
import {
  SessionKeys,
  generateKeypair,
  generateKeystoreFiles,
  generateSessionKeys,
} from "./keys.ts";
import {
  Chainspec,
  readAndParseChainSpec,
  writeChainSpec,
} from "./chainspec.ts";
import { copyKeystoresCmd } from "./copy-keystores.ts";
import { z } from "zod/mod.ts";

type MakeInitialValidators = {
  keystoresDir: string;
  validators: Map<string, string>;
  controllerKeysOutDir?: string;
};

type ValidatorNode = {
  name: string;
  validator: Validator;
};

type Validator = {
  stash: string;
  controller?: string;
  sessionKeys: SessionKeys;
};

type InitialValidatorsOut = {
  grandpaInitialAuthorities: string[];
  validators: ValidatorNode[];
};

async function makeInitialValidators({
  validators,
  keystoresDir,
  controllerKeysOutDir,
}: MakeInitialValidators): Promise<InitialValidatorsOut> {
  const nodes: ValidatorNode[] = [];
  if (controllerKeysOutDir) {
    await makeDir(controllerKeysOutDir);
  }
  for (const [name, stash] of validators.entries()) {
    const nodeKeystoreDir = `${keystoresDir}/${name}`;
    log(`Generating keystore files for ${name} in ${nodeKeystoreDir}`);
    const sessionKeys = await generateSessionKeys();
    await generateKeystoreFiles(sessionKeys, nodeKeystoreDir);
    let controller;
    if (controllerKeysOutDir) {
      const controllerKeysOutPath = `${controllerKeysOutDir}/${name}.json`;
      log(`Generating controller keys for ${name} in ${controllerKeysOutPath}`);
      const keypair = await generateKeypair("sr25519");
      controller = keypair.accountId;
      await Deno.writeTextFile(
        controllerKeysOutPath,
        JSON.stringify(keypair, null, 2)
      );
    }
    nodes.push({
      name,
      validator: {
        stash,
        controller,
        sessionKeys,
      },
    });
  }

  const grandpaInitialAuthorities = nodes.map(
    (n) => n.validator.sessionKeys.gran.accountId
  );

  return {
    grandpaInitialAuthorities,
    validators: nodes,
  };
}

async function patchCode(spec: Chainspec, codeSpecPath: string) {
  const codeSpec = await readAndParseChainSpec(codeSpecPath);
  spec.genesis.runtime.system.code = codeSpec.genesis.runtime.system.code;
}

const makeValidatorsCmd = new Command()
  .description("make keys, keystores for nodes")
  .option("-k --keystore <keystore>", "keystore file path", {
    default: "./keystores",
  })
  .option(
    "--controller-keys-out <controllerKeysOut>",
    "if set, the path to save generated controller private keys to. if unset, controllers won't be generated"
  )
  .option(
    "--validators <validators>",
    'path to validators JSON. the file should be of the form `{ "nodeName": "stashSs58" }`',
    {
      required: true,
    }
  )
  .action(async (options) => {
    const validatorsText = await Deno.readTextFile(options.validators);
    const validatorsJson = JSON.parse(validatorsText);
    const validators = await z
      .record(z.string(), z.string())
      .parseAsync(validatorsJson);

    const initialValidators = await makeInitialValidators({
      keystoresDir: options.keystore,
      validators: new Map(Object.entries(validators)),
      controllerKeysOutDir: options.controllerKeysOut,
    });
    console.log(JSON.stringify(initialValidators, null, 2));
  });

await new Command()
  .name("pos-keyprep")
  .version("0.0.1")
  .command("make-initial-validators", makeValidatorsCmd)
  .command("copy-keystores", copyKeystoresCmd)
  .command("patch-code <spec> <codeSpec>", "patch code spec file")
  .action(async (_options, spec, codeSpec) => {
    const chainSpec = await readAndParseChainSpec(spec);

    await patchCode(chainSpec, codeSpec);

    log(`Writing patched chain spec to ${spec}`, "green");
    writeChainSpec(spec, chainSpec);
  })
  .parse(Deno.args);
