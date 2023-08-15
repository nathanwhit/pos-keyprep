import {
  cryptoWaitReady,
  mnemonicGenerate,
} from "@polkadot/util-crypto/mod.ts";
import { Keyring } from "@polkadot/api/mod.ts";
import { u8aToHex } from "@polkadot/util/mod.ts";
import { makeDir } from "./utils.ts";

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

export async function generateKeypair<S extends KeyScheme>(
  scheme: S
): Promise<KeyPair<S>> {
  await cryptoWaitReady();

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

export async function generateSessionKeys(): Promise<SessionKeys> {
  const babe = await generateKeypair("sr25519");
  const imon = await generateKeypair("sr25519");
  const gran = await generateKeypair("ed25519");

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
