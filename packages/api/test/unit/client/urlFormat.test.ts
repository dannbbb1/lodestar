import {describe, expect, it} from "vitest";
import {
  Token,
  TokenType,
  compileRouteUrlFormatter,
  toColonNotationPath,
  urlToTokens,
} from "../../../src/utils/urlFormat.js";

describe("utils / urlFormat", () => {
  const testCases: {
    urlTemplate: string;
    colonNotation: string;
    tokens: Token[];
    cases: {
      args: Record<string, string | number>;
      url: string;
    }[];
  }[] = [
    {
      urlTemplate: "/beacon/{var1}/{var2}",
      colonNotation: "/beacon/:var1/:var2",
      tokens: [
        {type: TokenType.String, str: "/beacon/"},
        {type: TokenType.Variable, var: "var1"},
        {type: TokenType.String, str: "/"},
        {type: TokenType.Variable, var: "var2"},
      ],
      cases: [{args: {var1: "aaa", var2: "bbb"}, url: "/beacon/aaa/bbb"}],
    },
    {
      urlTemplate: "/beacon/{state_id}/states/{block_id}/root",
      colonNotation: "/beacon/:state_id/states/:block_id/root",
      tokens: [
        {type: TokenType.String, str: "/beacon/"},
        {type: TokenType.Variable, var: "state_id"},
        {type: TokenType.String, str: "/states/"},
        {type: TokenType.Variable, var: "block_id"},
        {type: TokenType.String, str: "/root"},
      ],
      cases: [{args: {state_id: "head", block_id: 1000}, url: "/beacon/head/states/1000/root"}],
    },
    {
      urlTemplate: "{a}{b}",
      colonNotation: ":a:b",
      tokens: [
        {type: TokenType.Variable, var: "a"},
        {type: TokenType.Variable, var: "b"},
      ],
      cases: [{args: {a: "aaa", b: "bbb"}, url: "aaabbb"}],
    },
  ];

  for (const {urlTemplate, colonNotation, tokens, cases} of testCases) {
    it(urlTemplate, () => {
      expect(urlToTokens(urlTemplate)).toEqual(tokens);

      expect(toColonNotationPath(urlTemplate)).toBe(colonNotation);

      const urlFormatter = compileRouteUrlFormatter(urlTemplate);

      for (const [_, {args, url}] of cases.entries()) {
        expect(urlFormatter(args)).toBe(url);
      }
    });
  }
});
