import all from "it-all";
import {pipe} from "it-pipe";
import {describe, it} from "vitest";
import {Protocol} from "../../../src/types.js";
import {responseEncodersTestCases} from "../../fixtures/encoders.js";
import {expectEqualByteChunks} from "../../utils/index.js";
import {responseEncode} from "../../utils/response.js";

describe("encoders / responseEncode", () => {
  describe("valid cases", () => {
    it.each(responseEncodersTestCases.filter((f) => !f.skipEncoding))(
      "$id",
      async ({protocol, responseChunks, chunks}) => {
        const encodedChunks = await pipe(responseEncode(responseChunks, protocol as Protocol), all);

        expectEqualByteChunks(
          encodedChunks as Uint8Array[],
          chunks.map((c) => c.subarray())
        );
      }
    );
  });
});
