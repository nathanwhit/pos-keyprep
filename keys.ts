import {
  cryptoWaitReady,
  mnemonicGenerate,
} from "@polkadot/util-crypto/mod.ts";
import { Keyring } from "@polkadot/api/mod.ts";
import { u8aToHex } from "@polkadot/util/mod.ts";
import { makeDir, nameCase } from "./utils.ts";

export type Account = {
  address: string;
  publicKey: string;
};

export type Accounts = {
  seed: string;
  mnemonic: string;
  sr_account: Account;
  sr_stash: Account;
  ed_account: Account;
};

export type Node = {
  name: string;
  accounts: Accounts;
};

export async function generateKeyForNode(nodeName?: string): Promise<Accounts> {
  await cryptoWaitReady();

  const mnemonic = mnemonicGenerate();
  const seed = nodeName ? `//${nameCase(nodeName)}` : mnemonic;

  const sr_keyring = new Keyring({ type: "sr25519" });
  const sr_account = sr_keyring.createFromUri(`${seed}`);
  const sr_stash = sr_keyring.createFromUri(`${seed}//stash`);

  const ed_keyring = new Keyring({ type: "ed25519" });
  const ed_account = ed_keyring.createFromUri(`${seed}`);

  // return the needed info
  return {
    seed,
    mnemonic,
    sr_account: {
      address: sr_account.address,
      publicKey: u8aToHex(sr_account.publicKey),
    },
    sr_stash: {
      address: sr_stash.address,
      publicKey: u8aToHex(sr_stash.publicKey),
    },
    ed_account: {
      address: ed_account.address,
      publicKey: u8aToHex(ed_account.publicKey),
    },
  };
}

export type KeyScheme = "ecdsa" | "sr25519" | "ed25519";

export type KeyPair<S extends KeyScheme> = {
  publicKey: string;
  mnemonic: string;
  /// AccountId in SS58 format. Usually an SS58 encoding of the public key.
  accountId: string;
  scheme: S;
};

export type SessionKeys = {
  babe: KeyPair<"sr25519">;
  imon: KeyPair<"sr25519">;
  gran: KeyPair<"ed25519">;
};

export function generateKeypair<S extends KeyScheme>(scheme: S): KeyPair<S> {
  const mnemonic = mnemonicGenerate();
  const keyring = new Keyring({ type: scheme });
  const pair = keyring.addFromUri(mnemonic);
  return {
    publicKey: u8aToHex(pair.publicKey, undefined, false),
    accountId: pair.address,
    mnemonic,
    scheme,
  };
}

export function generateSessionKeys() {
  const babe = generateKeypair("sr25519");
  const imon = generateKeypair("sr25519");
  const gran = generateKeypair("ed25519");

  return {
    babe,
    imon,
    gran,
  };
}

export async function generateKeystoreFiles(
  sessionKeys: SessionKeys,
  path: string
): Promise<string[]> {
  const keystoreDir = `${path}/keystore`;
  await makeDir(keystoreDir);

  const paths: string[] = [];

  for (const [k, v] of Object.entries(sessionKeys)) {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(k);
    const filename = u8aToHex(buffer, undefined, false) + v.publicKey;
    const keystoreFilePath = `${keystoreDir}/${filename}`;
    paths.push(keystoreFilePath);
    await Deno.writeTextFile(keystoreFilePath, `"${v.mnemonic}"`);
  }

  return paths;
}
