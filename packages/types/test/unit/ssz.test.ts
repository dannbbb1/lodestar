import {describe, expect, it} from "vitest";
import {ssz} from "../../src/index.js";

describe("size", () => {
  it("should calculate correct minSize and maxSize", () => {
    const minSize = ssz.phase0.BeaconState.minSize;
    const maxSize = ssz.phase0.BeaconState.maxSize;
    // https://gist.github.com/protolambda/db75c7faa1e94f2464787a480e5d613e
    expect(minSize).toBe(2687377);
    expect(maxSize).toBe(141837543039377);
  });
});

describe("container serialization/deserialization field casing(s)", () => {
  it("AttesterSlashing", () => {
    const test = {
      attestation1: ssz.phase0.IndexedAttestation.defaultValue(),
      attestation2: ssz.phase0.IndexedAttestation.defaultValue(),
    };
    const json = {
      attestation_1: ssz.phase0.IndexedAttestation.toJson(test.attestation1),
      attestation_2: ssz.phase0.IndexedAttestation.toJson(test.attestation2),
    };

    const result = ssz.phase0.AttesterSlashing.fromJson(json);
    const back = ssz.phase0.AttesterSlashing.toJson(result);
    expect(back).toEqual(json);
  });

  it("ProposerSlashing", () => {
    const test = {
      signedHeader1: ssz.phase0.SignedBeaconBlockHeader.defaultValue(),
      signedHeader2: ssz.phase0.SignedBeaconBlockHeader.defaultValue(),
    };
    const json = {
      signed_header_1: ssz.phase0.SignedBeaconBlockHeader.toJson(test.signedHeader1),
      signed_header_2: ssz.phase0.SignedBeaconBlockHeader.toJson(test.signedHeader2),
    };

    const result = ssz.phase0.ProposerSlashing.fromJson(json);
    const back = ssz.phase0.ProposerSlashing.toJson(result);
    expect(back).toEqual(json);
  });
});
