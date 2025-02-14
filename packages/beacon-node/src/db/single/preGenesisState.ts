import {ChainForkConfig} from "@lodestar/config";
import {Db} from "@lodestar/db";
import {ForkAll, GENESIS_SLOT} from "@lodestar/params";
import {BeaconStateAllForks} from "@lodestar/state-transition";
import {SSZTypesFor} from "@lodestar/types";
import {Bucket} from "../buckets.js";

export class PreGenesisState {
  private readonly config: ChainForkConfig;
  private readonly bucket: Bucket;
  private readonly db: Db;
  private readonly key: Uint8Array;
  private readonly type: SSZTypesFor<ForkAll, "BeaconState">;

  constructor(config: ChainForkConfig, db: Db) {
    this.config = config;
    this.db = db;
    this.bucket = Bucket.phase0_preGenesisState;
    this.key = new Uint8Array([this.bucket]);
    this.type = this.config.getForkTypes(GENESIS_SLOT).BeaconState;
  }

  async put(value: BeaconStateAllForks): Promise<void> {
    await this.db.put(this.key, value.serialize());
  }

  async get(): Promise<BeaconStateAllForks | null> {
    const value = await this.db.get(this.key);
    return value ? this.type.deserializeToViewDU(value) : null;
  }

  async delete(): Promise<void> {
    await this.db.delete(this.key);
  }
}
