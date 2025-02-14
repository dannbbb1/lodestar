import type {PublicKey} from "@chainsafe/bls/types";
import {BeaconConfig} from "@lodestar/config";
import {LightClientBootstrap, LightClientHeader, LightClientUpdate, SyncPeriod} from "@lodestar/types";
import {computeSyncPeriodAtSlot, deserializeSyncCommittee} from "../utils/index.js";
import {LightClientUpdateSummary} from "./isBetterUpdate.js";

export const MAX_SYNC_PERIODS_CACHE = 2;

export interface ILightClientStore {
  readonly config: BeaconConfig;

  /** Map of trusted SyncCommittee to be used for sig validation */
  readonly syncCommittees: Map<SyncPeriod, SyncCommitteeFast>;
  /** Map of best valid updates */
  readonly bestValidUpdates: Map<SyncPeriod, LightClientUpdateWithSummary>;

  getMaxActiveParticipants(period: SyncPeriod): number;
  setActiveParticipants(period: SyncPeriod, activeParticipants: number): void;

  // Header that is finalized
  finalizedHeader: LightClientHeader;

  // Most recent available reasonably-safe header
  optimisticHeader: LightClientHeader;
}

export interface LightClientStoreEvents {
  onSetFinalizedHeader?: (header: LightClientHeader) => void;
  onSetOptimisticHeader?: (header: LightClientHeader) => void;
}

export class LightClientStore implements ILightClientStore {
  readonly syncCommittees = new Map<SyncPeriod, SyncCommitteeFast>();
  readonly bestValidUpdates = new Map<SyncPeriod, LightClientUpdateWithSummary>();

  private _finalizedHeader: LightClientHeader;
  private _optimisticHeader: LightClientHeader;

  private readonly maxActiveParticipants = new Map<SyncPeriod, number>();

  constructor(
    readonly config: BeaconConfig,
    bootstrap: LightClientBootstrap,
    private readonly events: LightClientStoreEvents
  ) {
    const bootstrapPeriod = computeSyncPeriodAtSlot(bootstrap.header.beacon.slot);
    this.syncCommittees.set(bootstrapPeriod, deserializeSyncCommittee(bootstrap.currentSyncCommittee));
    this._finalizedHeader = bootstrap.header;
    this._optimisticHeader = bootstrap.header;
  }

  get finalizedHeader(): LightClientHeader {
    return this._finalizedHeader;
  }

  set finalizedHeader(value: LightClientHeader) {
    this._finalizedHeader = value;
    this.events.onSetFinalizedHeader?.(value);
  }

  get optimisticHeader(): LightClientHeader {
    return this._optimisticHeader;
  }

  set optimisticHeader(value: LightClientHeader) {
    this._optimisticHeader = value;
    this.events.onSetOptimisticHeader?.(value);
  }

  getMaxActiveParticipants(period: SyncPeriod): number {
    const currMaxParticipants = this.maxActiveParticipants.get(period) ?? 0;
    const prevMaxParticipants = this.maxActiveParticipants.get(period - 1) ?? 0;

    return Math.max(currMaxParticipants, prevMaxParticipants);
  }

  setActiveParticipants(period: SyncPeriod, activeParticipants: number): void {
    const maxActiveParticipants = this.maxActiveParticipants.get(period) ?? 0;
    if (activeParticipants > maxActiveParticipants) {
      this.maxActiveParticipants.set(period, activeParticipants);
    }

    // Prune old entries
    for (const key of this.maxActiveParticipants.keys()) {
      if (key < period - MAX_SYNC_PERIODS_CACHE) {
        this.maxActiveParticipants.delete(key);
      }
    }
  }
}

export type SyncCommitteeFast = {
  pubkeys: PublicKey[];
  aggregatePubkey: PublicKey;
};

export type LightClientUpdateWithSummary = {
  update: LightClientUpdate;
  summary: LightClientUpdateSummary;
};

// === storePeriod ? store.currentSyncCommittee : store.nextSyncCommittee;
// if (!syncCommittee) {
//   throw Error(`syncCommittee not available for signature period ${updateSignaturePeriod}`);
// }
