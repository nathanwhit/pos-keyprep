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
subcommand that just executes all of the `kubectl cp` commands to copy the keys to the according nodes.

*Note:* This will run the kubectl commands in whatever context / namespace you're currently in, so you should set the correct context and namespace before running it

1. Make sure you have the keystores generated in the previous section, for example `./generatedKeystores`
2. Do a dry run of the copy commands via

    ```bash
    deno run main.ts copy-keystores --dry-run --keystores ./generatedKeystores --chain-spec ./myTargetChainSpec.json
    ```

    Will print something like:

    ```text
    running kubectl cp generatedKeystores/test-miner-creditcoin-miner-0/keystore/62616265526c7315c1551425fed10d4fec7dfb49b2dbfe1a4c4f330189fc805990abfa78 test-miner-creditcoin-miner-0:/data/chains/creditcoin-staging/keystore/62616265526c7315c1551425fed10d4fec7dfb49b2dbfe1a4c4f330189fc805990abfa78
    running kubectl cp generatedKeystores/test-miner-creditcoin-miner-0/keystore/6772616e37d6c3ba3742dc92d7a4ec01b21ce60ac3631a85443145652ebc1b7bdf3dea32 test-miner-creditcoin-miner-0:/data/chains/creditcoin-staging/keystore/6772616e37d6c3ba3742dc92d7a4ec01b21ce60ac3631a85443145652ebc1b7bdf3dea32
    running kubectl cp generatedKeystores/test-miner-creditcoin-miner-0/keystore/696d6f6ed664a2e95b2c924019a52593f5db251d090a620943611412ff490a5ce3a7786d test-miner-creditcoin-miner-0:/data/chains/creditcoin-staging/keystore/696d6f6ed664a2e95b2c924019a52593f5db251d090a620943611412ff490a5ce3a7786d
    running kubectl cp generatedKeystores/test-miner-creditcoin-miner-0/keystore/696d6f6ed24fc681408e373f798231081bca59ecd902f4a7c289ae817f69970f1407ad26 test-miner-creditcoin-miner-0:/data/chains/creditcoin-staging/keystore/696d6f6ed24fc681408e373f798231081bca59ecd902f4a7c289ae817f69970f1407ad26
    running kubectl cp generatedKeystores/test-miner-creditcoin-miner-0/keystore/6261626502afb93461cf9864b141c2f05cb27357ee146d08471c622ca75d4c4ec25a4c04 test-miner-creditcoin-miner-0:/data/chains/creditcoin-staging/keystore/6261626502afb93461cf9864b141c2f05cb27357ee146d08471c622ca75d4c4ec25a4c04
    running kubectl cp generatedKeystores/test-miner-creditcoin-miner-0/keystore/6772616eba89a7b1054357d10e3e2471af6d9e2e456188db7dd9e5c524800de7189bbc96 test-miner-creditcoin-miner-0:/data/chains/creditcoin-staging/keystore/6772616eba89a7b1054357d10e3e2471af6d9e2e456188db7dd9e5c524800de7189bbc96
    running kubectl cp generatedKeystores/test-miner-creditcoin-miner-0/keystore/6772616e80d847e66e3262c79f5f70c27ce7e904bf85294d833317dacd93dc5f54908238 test-miner-creditcoin-miner-0:/data/chains/creditcoin-staging/keystore/6772616e80d847e66e3262c79f5f70c27ce7e904bf85294d833317dacd93dc5f54908238
    running kubectl cp generatedKeystores/test-miner-creditcoin-miner-0/keystore/696d6f6e74f4485664568f6f710f6ba10bc46ae34444225b261580561e62eaa3c123970a test-miner-creditcoin-miner-0:/data/chains/creditcoin-staging/keystore/696d6f6e74f4485664568f6f710f6ba10bc46ae34444225b261580561e62eaa3c123970a
    running kubectl cp generatedKeystores/test-miner-creditcoin-miner-0/keystore/62616265c2679fb51436f7b0390f56cb1c0add2bbfdd00ca44b877122b700c575b92fa75 test-miner-creditcoin-miner-0:/data/chains/creditcoin-staging/keystore/62616265c2679fb51436f7b0390f56cb1c0add2bbfdd00ca44b877122b700c575b92fa75
    running kubectl cp generatedKeystores/test-creditcoin-bootnode-0/keystore/626162657a6d4668466cd69143fa12ed3b7e057d57b11f442fdc42748b9964900e3e8f63 test-creditcoin-bootnode-0:/data/chains/creditcoin-staging/keystore/626162657a6d4668466cd69143fa12ed3b7e057d57b11f442fdc42748b9964900e3e8f63
    running kubectl cp generatedKeystores/test-creditcoin-bootnode-0/keystore/696d6f6e60e938afb9f6a0c49b1a03a0856e97606f1df68ed591e68c05856fc1c596db12 test-creditcoin-bootnode-0:/data/chains/creditcoin-staging/keystore/696d6f6e60e938afb9f6a0c49b1a03a0856e97606f1df68ed591e68c05856fc1c596db12
    running kubectl cp generatedKeystores/test-creditcoin-bootnode-0/keystore/696d6f6e50d8f3b775d52a040d68f2d9ec583e468263ca4429711c77fcb1402a88dd815f test-creditcoin-bootnode-0:/data/chains/creditcoin-staging/keystore/696d6f6e50d8f3b775d52a040d68f2d9ec583e468263ca4429711c77fcb1402a88dd815f
    running kubectl cp generatedKeystores/test-creditcoin-bootnode-0/keystore/62616265f646f6c5e960ee20a172fa54f8757defc007a22c7971c6ec760c6bf66bd04c37 test-creditcoin-bootnode-0:/data/chains/creditcoin-staging/keystore/62616265f646f6c5e960ee20a172fa54f8757defc007a22c7971c6ec760c6bf66bd04c37
    running kubectl cp generatedKeystores/test-creditcoin-bootnode-0/keystore/6772616ec4c4056558459f6f2cca8d4f11a1f4e8c2cea051563523051a18bdbda9bff57c test-creditcoin-bootnode-0:/data/chains/creditcoin-staging/keystore/6772616ec4c4056558459f6f2cca8d4f11a1f4e8c2cea051563523051a18bdbda9bff57c
    running kubectl cp generatedKeystores/test-creditcoin-bootnode-0/keystore/696d6f6e94f6010295aaaf927b8f6485602292fa59aa2dcf61f8ea156288876dfd587d71 test-creditcoin-bootnode-0:/data/chains/creditcoin-staging/keystore/696d6f6e94f6010295aaaf927b8f6485602292fa59aa2dcf61f8ea156288876dfd587d71
    running kubectl cp generatedKeystores/test-creditcoin-bootnode-0/keystore/696d6f6e5e5445feb4122c21dac8ac641752b647e42ee9250a57ea5f354c26fc8d2eed69 test-creditcoin-bootnode-0:/data/chains/creditcoin-staging/keystore/696d6f6e5e5445feb4122c21dac8ac641752b647e42ee9250a57ea5f354c26fc8d2eed69
    running kubectl cp generatedKeystores/test-creditcoin-bootnode-0/keystore/62616265c0d4c9b8013b4f25cd7f566a85078f73a842f88764e7743c86cd9460f208b342 test-creditcoin-bootnode-0:/data/chains/creditcoin-staging/keystore/62616265c0d4c9b8013b4f25cd7f566a85078f73a842f88764e7743c86cd9460f208b342
    running kubectl cp generatedKeystores/test-creditcoin-bootnode-0/keystore/62616265d025e4c2747df91a4d217b569903a6648f3971a13922451f20da4a470d11a756 test-creditcoin-bootnode-0:/data/chains/creditcoin-staging/keystore/62616265d025e4c2747df91a4d217b569903a6648f3971a13922451f20da4a470d11a756
    running kubectl cp generatedKeystores/test-creditcoin-bootnode-0/keystore/6772616ee96e2464709f00c0d7958f48256e27077bf90197f09674d2766b9844debd959e test-creditcoin-bootnode-0:/data/chains/creditcoin-staging/keystore/6772616ee96e2464709f00c0d7958f48256e27077bf90197f09674d2766b9844debd959e
    running kubectl cp generatedKeystores/test-creditcoin-bootnode-0/keystore/6772616e23538c640baa3e41a28b80527301aefe79129897fd5eeb816baabd97a2fb83bf test-creditcoin-bootnode-0:/data/chains/creditcoin-staging/keystore/6772616e23538c640baa3e41a28b80527301aefe79129897fd5eeb816baabd97a2fb83bf
    running kubectl cp generatedKeystores/test-creditcoin-bootnode-0/keystore/6772616e9c30a8d0e7cf24ab9982c336ca018ddd2b776029a081d59a72393fd95bf47de4 test-creditcoin-bootnode-0:/data/chains/creditcoin-staging/keystore/6772616e9c30a8d0e7cf24ab9982c336ca018ddd2b776029a081d59a72393fd95bf47de4
    ```

3. Assuming that all looks reasonable, it's time to actually copy the keys. Just run the same command minus the `--dry-run` flag.

    ```bash
    deno run main.ts copy-keystores --keystores ./generatedKeystores --chain-spec ./myTargetChainSpec.json
    ```
