# PoS keyprep

[Install deno](https://deno.land/manual@v1.36.0/getting_started/installation)

To run the script, use

```bash
deno run main.ts
```

**NOTE** Deno is sandboxed, and so it will by default prompt you for access to any external resource on a case-by-case basis. So that means any time a file would be read, written, a network connection would be made, or an external process would
be executed, you will get a prompt asking for permission. You can allow these accesses by specifying them in `deno run`. E.g. `deno run --allow-read=. main.ts` would allow read access to any file in the current directory. If you don't care about
the sandboxing or guarantees that gives you, you can allow everything with `-A`, i.e. `deno run -A main.ts`.

## Create initial validators

Generate session keys and keystores and such for a set of validators.

1. Set up a file mapping k8s pod to validator stash account e.g.

(In a hypothetical `validators.json`)

```json
{
  "test-creditcoin-bootnode-0": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "test-miner-creditcoin-miner-0": "5GVwAgeMv82MYMvuthgDGS9uEeDF2a1DeCzKmv7UDFs7GygA"
}
```

2. Decide if you want to generate controller keys as well

3. Run the script

Note: if you don't want to generate controller keys, then omit `--controller-keys-out ./controllers`

```bash
deno run main.ts make-intial-validators --keystore ./generatedKeystores --controller-keys-out ./controllers --validators ./validators.json
```

After the script completes, generated session keys with the appropriate directory structure will be in `./generatedKeystores`. The keypairs for the generated controllers
(if you want them) will be in `./controllers`. On stdout you'll get a printout of the info, like so:

```json
{
  "grandpaInitialAuthorities": [
    "5Cs2MP157KByH7nJQBeoqgkL6vypmU2ZispE2hxVuSV1yH9Y",
    "5EyeEbbRzUQ1yTZ7Bs5kum1DZkweqWAKoeMUKWX7suvwSFMX"
  ],
  "validators": [
    {
      "name": "test-creditcoin-bootnode-0",
      "validator": {
        "stash": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        "controller": "5HNSMFCQ2ue1b68E3kQQmj4jNwkgHqmwhpxsAt24b9HYE44Q",
        "sessionKeys": {
          "babe": {
            "publicKey": "7a6d4668466cd69143fa12ed3b7e057d57b11f442fdc42748b9964900e3e8f63",
            "accountId": "5EqEAGNWdG2SfV29STymLnP56AgBDiyGYs8N8ADWRpyWVr4c",
            "mnemonic": "vacant misery return sheriff situate essence toilet garment various express swap tide",
            "scheme": "sr25519"
          },
          "imon": {
            "publicKey": "5e5445feb4122c21dac8ac641752b647e42ee9250a57ea5f354c26fc8d2eed69",
            "accountId": "5ECPPjVDxpkhDmDj55e6DGCoKDaParZF5NopnRm7f6p6Xjjs",
            "mnemonic": "wire write fatigue pilot quality rotate laundry river lake garden inner inform",
            "scheme": "sr25519"
          },
          "gran": {
            "publicKey": "23538c640baa3e41a28b80527301aefe79129897fd5eeb816baabd97a2fb83bf",
            "accountId": "5Cs2MP157KByH7nJQBeoqgkL6vypmU2ZispE2hxVuSV1yH9Y",
            "mnemonic": "flock style bulb good present topple grow field online speed auction wage",
            "scheme": "ed25519"
          }
        }
      }
    },
    {
      "name": "test-miner-creditcoin-miner-0",
      "validator": {
        "stash": "5GVwAgeMv82MYMvuthgDGS9uEeDF2a1DeCzKmv7UDFs7GygA",
        "controller": "5F9WjqTAaqGXj6zQF1Jo7SWBQKd2TpKT1vVC6gzYRpcLXbue",
        "sessionKeys": {
          "babe": {
            "publicKey": "02afb93461cf9864b141c2f05cb27357ee146d08471c622ca75d4c4ec25a4c04",
            "accountId": "5C8E9sJJhhWFJ6PPWjc8tcVuUVxevCtEVSpgUH224pU3sBpm",
            "mnemonic": "man wait regret pull virtual protect program bind february illegal clock flight",
            "scheme": "sr25519"
          },
          "imon": {
            "publicKey": "d664a2e95b2c924019a52593f5db251d090a620943611412ff490a5ce3a7786d",
            "accountId": "5GuozwMrA6vGVt1yiXF1j2Tmfsc9neHR47TErdSPqeEEhjnp",
            "mnemonic": "entire mother large orchard grape perfect speed fashion alcohol wrist employ fossil",
            "scheme": "sr25519"
          },
          "gran": {
            "publicKey": "80d847e66e3262c79f5f70c27ce7e904bf85294d833317dacd93dc5f54908238",
            "accountId": "5EyeEbbRzUQ1yTZ7Bs5kum1DZkweqWAKoeMUKWX7suvwSFMX",
            "mnemonic": "arrest course rotate cross volume member season resemble dizzy avoid fabric security",
            "scheme": "ed25519"
          }
        }
      }
    }
  ]
}
```

You'd want to copy the `grandpaInitialValidators` bit into the chainspec (just that key and value). The rest you would use to inform
your invocation of `switch_to_pos`. You probably want to save all of it somewhere.

## Copy keystores to pods

After you've generated all of your session keys, you now need to get them onto the actual validator nodes. The easiest way to do that is to use a nifty
subcommand that just generates