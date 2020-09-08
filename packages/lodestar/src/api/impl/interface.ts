import {IBeaconConfig} from "@chainsafe/lodestar-config";
import {ILogger} from "@chainsafe/lodestar-utils";

import {IBeaconChain} from "../../chain";
import {IBeaconDb} from "../../db/api";
import {IBeaconSync} from "../../sync";
import {INetwork} from "../../network";
import {IEth1ForBlockProduction} from "../../eth1";

import {IBeaconApi} from "./beacon";
import {INodeApi} from "./node";
import {IValidatorApi} from "./validator";

export const enum ApiNamespace {
  BEACON = "beacon",
  VALIDATOR = "validator",
  NODE = "node",
}

export interface IApiModules {
  config: IBeaconConfig;
  logger: ILogger;
  chain: IBeaconChain;
  sync: IBeaconSync;
  network: INetwork;
  db: IBeaconDb;
  eth1: IEth1ForBlockProduction;
}

export interface IApi {
  beacon: IBeaconApi;
  node: INodeApi;
  validator: IValidatorApi;
}
