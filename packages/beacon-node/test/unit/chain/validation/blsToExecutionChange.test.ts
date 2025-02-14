import {digest} from "@chainsafe/as-sha256";
import {SecretKey} from "@chainsafe/blst";
import {createBeaconConfig} from "@lodestar/config";
import {config as defaultConfig} from "@lodestar/config/default";
import {
  BLS_WITHDRAWAL_PREFIX,
  DOMAIN_BLS_TO_EXECUTION_CHANGE,
  ETH1_ADDRESS_WITHDRAWAL_PREFIX,
  FAR_FUTURE_EPOCH,
  ForkName,
  SLOTS_PER_EPOCH,
} from "@lodestar/params";
import {computeSigningRoot} from "@lodestar/state-transition";
import {capella, ssz} from "@lodestar/types";
import {afterEach, beforeEach, describe, it, vi} from "vitest";
import {BlsToExecutionChangeErrorCode} from "../../../../src/chain/errors/blsToExecutionChangeError.js";
import {validateGossipBlsToExecutionChange} from "../../../../src/chain/validation/blsToExecutionChange.js";
import {MockedBeaconChain, getMockedBeaconChain} from "../../../mocks/mockedBeaconChain.js";
import {createCachedBeaconStateTest} from "../../../utils/cachedBeaconState.js";
import {expectRejectedWithLodestarError} from "../../../utils/errors.js";
import {generateState} from "../../../utils/state.js";

describe("validate bls to execution change", () => {
  let chainStub: MockedBeaconChain;
  let opPool: MockedBeaconChain["opPool"];

  const stateEmpty = ssz.phase0.BeaconState.defaultValue();
  // Validator has to be active for long enough
  stateEmpty.slot = defaultConfig.SHARD_COMMITTEE_PERIOD * SLOTS_PER_EPOCH;
  // A withdrawal key which we will keep same on the two vals we generate
  const wsk = SecretKey.fromKeygen(Buffer.alloc(32));

  // Generate and add first val
  const sk1 = SecretKey.fromKeygen(Buffer.alloc(32, 1));
  const pubkey1 = sk1.toPublicKey().toBytes();
  const fromBlsPubkey = wsk.toPublicKey().toBytes();
  const withdrawalCredentials = digest(fromBlsPubkey);
  withdrawalCredentials[0] = BLS_WITHDRAWAL_PREFIX;
  const validator = ssz.phase0.Validator.toViewDU({
    pubkey: pubkey1,
    withdrawalCredentials,
    effectiveBalance: 32e9,
    slashed: false,
    activationEligibilityEpoch: 0,
    activationEpoch: 0,
    exitEpoch: FAR_FUTURE_EPOCH,
    withdrawableEpoch: FAR_FUTURE_EPOCH,
  });
  stateEmpty.validators[0] = validator;

  // Gen and add second val
  const sk2 = SecretKey.fromKeygen(Buffer.alloc(32, 2));
  const pubkey2 = sk2.toPublicKey().toBytes();
  // Set the next validator to already eth1 credential
  const withdrawalCredentialsTwo = digest(fromBlsPubkey);
  withdrawalCredentialsTwo[0] = ETH1_ADDRESS_WITHDRAWAL_PREFIX;
  const validatorTwo = ssz.phase0.Validator.toViewDU({
    pubkey: pubkey2,
    withdrawalCredentials: withdrawalCredentialsTwo,
    effectiveBalance: 32e9,
    slashed: false,
    activationEligibilityEpoch: 0,
    activationEpoch: 0,
    exitEpoch: FAR_FUTURE_EPOCH,
    withdrawableEpoch: FAR_FUTURE_EPOCH,
  });
  stateEmpty.validators[1] = validatorTwo;

  // Generate the state
  const _state = generateState(stateEmpty, defaultConfig);
  const config = createBeaconConfig(defaultConfig, _state.genesisValidatorsRoot);
  const state = createCachedBeaconStateTest(_state, config);

  // Gen a valid blsToExecutionChange for first val
  const blsToExecutionChange = {
    validatorIndex: 0,
    fromBlsPubkey,
    toExecutionAddress: Buffer.alloc(20),
  };
  const signatureFork = ForkName.phase0;
  const domain = config.getDomainAtFork(signatureFork, DOMAIN_BLS_TO_EXECUTION_CHANGE);
  const signingRoot = computeSigningRoot(ssz.capella.BLSToExecutionChange, blsToExecutionChange, domain);
  const signedBlsToExecChange = {message: blsToExecutionChange, signature: wsk.sign(signingRoot).toBytes()};

  beforeEach(() => {
    chainStub = getMockedBeaconChain();
    opPool = chainStub.opPool;
    vi.spyOn(chainStub, "getHeadState").mockReturnValue(state);
    vi.spyOn(chainStub, "getHeadStateAtCurrentEpoch");
    vi.spyOn(opPool, "hasSeenBlsToExecutionChange");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return invalid bls to execution Change - existing", async () => {
    const signedBlsToExecChangeInvalid: capella.SignedBLSToExecutionChange = {
      message: signedBlsToExecChange.message,
      signature: Buffer.alloc(96, 0),
    };

    // Return BlsToExecutionChange known
    opPool.hasSeenBlsToExecutionChange.mockReturnValue(true);

    await expectRejectedWithLodestarError(
      validateGossipBlsToExecutionChange(chainStub, signedBlsToExecChangeInvalid),
      BlsToExecutionChangeErrorCode.ALREADY_EXISTS
    );
  });

  it("should return valid blsToExecutionChange ", async () => {
    await validateGossipBlsToExecutionChange(chainStub, signedBlsToExecChange);
  });

  it("should return invalid bls to execution Change - invalid validatorIndex", async () => {
    const signedBlsToExecChangeInvalid: capella.SignedBLSToExecutionChange = {
      message: {
        validatorIndex: 2,
        fromBlsPubkey: Buffer.alloc(48),
        toExecutionAddress: Buffer.alloc(20),
      },
      signature: Buffer.alloc(96, 0),
    };

    await expectRejectedWithLodestarError(
      validateGossipBlsToExecutionChange(chainStub, signedBlsToExecChangeInvalid),
      BlsToExecutionChangeErrorCode.INVALID
    );
  });

  it("should return invalid bls to execution Change - already eth1", async () => {
    const signedBlsToExecChangeInvalid: capella.SignedBLSToExecutionChange = {
      message: {
        ...signedBlsToExecChange.message,
        validatorIndex: 1,
      },
      signature: Buffer.alloc(96, 0),
    };

    await expectRejectedWithLodestarError(
      validateGossipBlsToExecutionChange(chainStub, signedBlsToExecChangeInvalid),
      BlsToExecutionChangeErrorCode.INVALID
    );
  });

  it("should return invalid bls to execution Change - invalid withdrawal credentials", async () => {
    const signedBlsToExecChangeInvalid: capella.SignedBLSToExecutionChange = {
      message: {
        validatorIndex: 1,
        fromBlsPubkey: Buffer.alloc(48),
        toExecutionAddress: Buffer.alloc(20),
      },
      signature: Buffer.alloc(96, 0),
    };

    await expectRejectedWithLodestarError(
      validateGossipBlsToExecutionChange(chainStub, signedBlsToExecChangeInvalid),
      BlsToExecutionChangeErrorCode.INVALID
    );
  });

  it("should return invalid bls to execution Change - invalid fromBlsPubkey", async () => {
    const signedBlsToExecChangeInvalid: capella.SignedBLSToExecutionChange = {
      message: {
        validatorIndex: 0,
        fromBlsPubkey: Buffer.alloc(48, 1),
        toExecutionAddress: Buffer.alloc(20),
      },
      signature: Buffer.alloc(96, 0),
    };

    await expectRejectedWithLodestarError(
      validateGossipBlsToExecutionChange(chainStub, signedBlsToExecChangeInvalid),
      BlsToExecutionChangeErrorCode.INVALID
    );
  });
});
