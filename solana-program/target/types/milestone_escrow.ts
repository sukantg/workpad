/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/milestone_escrow.json`.
 */
export type MilestoneEscrow = {
  "address": "JBRL2c7Bu9FdygTcVyadbWdyPubNSL1igRg32CuLaUZ4",
  "metadata": {
    "name": "milestoneEscrow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Multi-stage escrow program with milestone payments"
  },
  "instructions": [
    {
      "name": "assignFreelancer",
      "discriminator": [
        27,
        101,
        101,
        33,
        185,
        240,
        49,
        35
      ],
      "accounts": [
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "escrow.gig_id",
                "account": "escrow"
              }
            ]
          }
        },
        {
          "name": "client",
          "signer": true,
          "relations": [
            "escrow"
          ]
        }
      ],
      "args": [
        {
          "name": "freelancer",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "closeEscrow",
      "discriminator": [
        139,
        171,
        94,
        146,
        191,
        91,
        144,
        50
      ],
      "accounts": [
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "escrow.gig_id",
                "account": "escrow"
              }
            ]
          }
        },
        {
          "name": "client",
          "writable": true,
          "signer": true,
          "relations": [
            "escrow"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "initializeEscrow",
      "discriminator": [
        243,
        160,
        77,
        153,
        11,
        92,
        48,
        209
      ],
      "accounts": [
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "arg",
                "path": "gigId"
              }
            ]
          }
        },
        {
          "name": "client",
          "writable": true,
          "signer": true
        },
        {
          "name": "clientTokenAccount",
          "writable": true
        },
        {
          "name": "escrowTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gigId",
          "type": "string"
        },
        {
          "name": "totalAmount",
          "type": "u64"
        },
        {
          "name": "milestoneCount",
          "type": "u8"
        },
        {
          "name": "milestoneAmounts",
          "type": {
            "option": {
              "vec": "u64"
            }
          }
        }
      ]
    },
    {
      "name": "refundEscrow",
      "discriminator": [
        107,
        186,
        89,
        99,
        26,
        194,
        23,
        204
      ],
      "accounts": [
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "escrow.gig_id",
                "account": "escrow"
              }
            ]
          }
        },
        {
          "name": "client",
          "writable": true,
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrowTokenAccount",
          "writable": true
        },
        {
          "name": "clientTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "releaseMilestone",
      "discriminator": [
        56,
        2,
        199,
        164,
        184,
        108,
        167,
        222
      ],
      "accounts": [
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "escrow.gig_id",
                "account": "escrow"
              }
            ]
          }
        },
        {
          "name": "client",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrowTokenAccount",
          "writable": true
        },
        {
          "name": "freelancerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amountToRelease",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "escrow",
      "discriminator": [
        31,
        213,
        123,
        187,
        186,
        22,
        218,
        155
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidStatus",
      "msg": "Invalid escrow status for this operation"
    },
    {
      "code": 6001,
      "name": "exceedsTotalAmount",
      "msg": "Amount exceeds total escrow amount"
    },
    {
      "code": 6002,
      "name": "unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6003,
      "name": "alreadyCompleted",
      "msg": "Escrow already completed"
    },
    {
      "code": 6004,
      "name": "invalidTokenAccount",
      "msg": "Invalid token account"
    },
    {
      "code": 6005,
      "name": "mintMismatch",
      "msg": "Token mint mismatch"
    },
    {
      "code": 6006,
      "name": "invalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6007,
      "name": "invalidMilestoneCount",
      "msg": "Invalid milestone count"
    },
    {
      "code": 6008,
      "name": "freelancerNotAssigned",
      "msg": "Freelancer not assigned"
    },
    {
      "code": 6009,
      "name": "exceedsMilestoneCount",
      "msg": "Exceeds milestone count"
    },
    {
      "code": 6010,
      "name": "invalidMilestoneAmount",
      "msg": "Invalid milestone amount"
    },
    {
      "code": 6011,
      "name": "invalidMilestoneAmounts",
      "msg": "Invalid milestone amounts configuration"
    },
    {
      "code": 6012,
      "name": "fundsNotReleased",
      "msg": "Funds not fully released"
    }
  ],
  "types": [
    {
      "name": "escrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          },
          {
            "name": "gigId",
            "type": "string"
          },
          {
            "name": "totalAmount",
            "type": "u64"
          },
          {
            "name": "paidAmount",
            "type": "u64"
          },
          {
            "name": "milestoneCount",
            "type": "u8"
          },
          {
            "name": "currentMilestone",
            "type": "u8"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "escrowStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "milestoneAmounts",
            "type": {
              "vec": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "escrowStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "initialized"
          },
          {
            "name": "inProgress"
          },
          {
            "name": "completed"
          },
          {
            "name": "refunded"
          }
        ]
      }
    }
  ]
};
