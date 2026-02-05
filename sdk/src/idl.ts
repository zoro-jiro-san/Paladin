export const SmartWalletIDL = {
  version: "0.1.0",
  name: "smart_wallet",
  instructions: [
    {
      name: "initialize",
      accounts: [
        {
          name: "smartWallet",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "authority",
          type: "publicKey",
        },
        {
          name: "dailyLimit",
          type: "u64",
        },
      ],
    },
    {
      name: "transferSol",
      accounts: [
        {
          name: "smartWallet",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "recipient",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
      ],
    },
    {
      name: "depositSol",
      accounts: [
        {
          name: "vault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "depositor",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "amount",
          type: "u64",
        },
      ],
    },
    {
      name: "registerAgent",
      accounts: [
        {
          name: "agentRegistry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "agent",
          isMut: false,
          isSigner: true,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "agentName",
          type: "string",
        },
        {
          name: "permissions",
          type: "u64",
        },
      ],
    },
    {
      name: "addPlugin",
      accounts: [
        {
          name: "smartWallet",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "pluginType",
          type: {
            defined: "PluginType",
          },
        },
        {
          name: "config",
          type: "bytes",
        },
      ],
    },
    {
      name: "updateAuthority",
      accounts: [
        {
          name: "smartWallet",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "newAuthority",
          type: "publicKey",
        },
      ],
    },
    {
      name: "updateDailyLimit",
      accounts: [
        {
          name: "smartWallet",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "newLimit",
          type: "u64",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "SmartWallet",
      fields: [
        {
          name: "authority",
          type: "publicKey",
        },
        {
          name: "vault",
          type: "publicKey",
        },
        {
          name: "dailyLimit",
          type: "u64",
        },
        {
          name: "spentToday",
          type: "u64",
        },
        {
          name: "lastReset",
          type: "i64",
        },
        {
          name: "nonce",
          type: "u64",
        },
        {
          name: "bump",
          type: "u8",
        },
        {
          name: "plugins",
          type: {
            vec: {
              defined: "PluginConfig",
            },
          },
        },
      ],
    },
    {
      name: "AgentRegistry",
      fields: [
        {
          name: "agents",
          type: {
            map: {
              key: "publicKey",
              value: {
                defined: "AgentMetadata",
              },
            },
          },
        },
      ],
    },
  ],
  types: [
    {
      name: "AgentMetadata",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pubkey",
            type: "publicKey",
          },
          {
            name: "name",
            type: "string",
          },
          {
            name: "owner",
            type: "publicKey",
          },
          {
            name: "createdAt",
            type: "i64",
          },
          {
            name: "verified",
            type: "bool",
          },
          {
            name: "reputationScore",
            type: "u32",
          },
          {
            name: "permissions",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "PluginConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pluginType",
            type: {
              defined: "PluginType",
            },
          },
          {
            name: "config",
            type: "bytes",
          },
          {
            name: "enabled",
            type: "bool",
          },
        ],
      },
    },
    {
      name: "PluginType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "DailyLimit",
          },
          {
            name: "Whitelist",
          },
          {
            name: "RateLimit",
          },
          {
            name: "MultiSig",
          },
          {
            name: "Custom",
          },
        ],
      },
    },
  ],
  events: [
    {
      name: "TransferEvent",
      fields: [
        {
          name: "from",
          type: "publicKey",
          index: false,
        },
        {
          name: "to",
          type: "publicKey",
          index: true,
        },
        {
          name: "amount",
          type: "u64",
          index: false,
        },
        {
          name: "timestamp",
          type: "i64",
          index: false,
        },
      ],
    },
    {
      name: "DepositEvent",
      fields: [
        {
          name: "to",
          type: "publicKey",
          index: true,
        },
        {
          name: "amount",
          type: "u64",
          index: false,
        },
        {
          name: "timestamp",
          type: "i64",
          index: false,
        },
      ],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "DailyLimitExceeded",
      msg: "Daily limit exceeded",
    },
    {
      code: 6001,
      name: "Unauthorized",
      msg: "Unauthorized",
    },
    {
      code: 6002,
      name: "InvalidAmount",
      msg: "Invalid amount",
    },
    {
      code: 6003,
      name: "PluginValidationFailed",
      msg: "Plugin validation failed",
    },
    {
      code: 6004,
      name: "InsufficientBalance",
      msg: "Insufficient balance",
    },
  ],
};
