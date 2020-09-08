/**
 * @module db/api/beacon
 */

import {SignedBeaconBlock} from "@chainsafe/lodestar-types";
import {DatabaseService, IDatabaseApiOptions} from "../abstract";
import {IBeaconDb} from "./interface";
import {
  AggregateAndProofRepository,
  AttestationRepository,
  AttesterSlashingRepository,
  BadBlockRepository,
  BlockArchiveRepository,
  BlockRepository,
  ProposerSlashingRepository,
  StateArchiveRepository,
  VoluntaryExitRepository,
  DepositLogRepository,
  DepositDataRootRepository,
  Eth1BlockHeaderRepository,
  Eth1DataDepositRepository,
} from "./repositories";
import {StateContextCache} from "./stateContextCache";
import {CheckpointStateCache} from "./stateContextCheckpointsCache";
import {SeenAttestationCache} from "./seenAttestationCache";

export class BeaconDb extends DatabaseService implements IBeaconDb {
  public badBlock: BadBlockRepository;
  public block: BlockRepository;
  public stateCache: StateContextCache;
  public checkpointStateCache: CheckpointStateCache;
  public seenAttestationCache: SeenAttestationCache;
  public blockArchive: BlockArchiveRepository;
  public stateArchive: StateArchiveRepository;

  public attestation: AttestationRepository;
  public aggregateAndProof: AggregateAndProofRepository;
  public voluntaryExit: VoluntaryExitRepository;
  public proposerSlashing: ProposerSlashingRepository;
  public attesterSlashing: AttesterSlashingRepository;

  public depositLog: DepositLogRepository;
  public depositDataRoot: DepositDataRootRepository;
  public eth1BlockHeader: Eth1BlockHeaderRepository;
  public eth1DataDeposit: Eth1DataDepositRepository;

  public constructor(opts: IDatabaseApiOptions) {
    super(opts);
    this.badBlock = new BadBlockRepository(this.config, this.db);
    this.block = new BlockRepository(this.config, this.db);
    this.stateCache = new StateContextCache();
    this.checkpointStateCache = new CheckpointStateCache(this.config);
    this.seenAttestationCache = new SeenAttestationCache(5000);
    this.blockArchive = new BlockArchiveRepository(this.config, this.db);
    this.stateArchive = new StateArchiveRepository(this.config, this.db);

    this.attestation = new AttestationRepository(this.config, this.db);
    this.aggregateAndProof = new AggregateAndProofRepository(this.config, this.db);
    this.voluntaryExit = new VoluntaryExitRepository(this.config, this.db);
    this.proposerSlashing = new ProposerSlashingRepository(this.config, this.db);
    this.attesterSlashing = new AttesterSlashingRepository(this.config, this.db);

    this.depositLog = new DepositLogRepository(this.config, this.db);
    this.depositDataRoot = new DepositDataRootRepository(this.config, this.db);
    this.eth1DataDeposit = new Eth1DataDepositRepository(this.config, this.db);
    this.eth1BlockHeader = new Eth1BlockHeaderRepository(this.config, this.db);
  }

  /**
   * Remove stored operations based on a newly processed block
   */
  public async processBlockOperations(signedBlock: SignedBeaconBlock): Promise<void> {
    await Promise.all([
      this.voluntaryExit.batchRemove(signedBlock.message.body.voluntaryExits),
      this.depositLog.deleteOld(signedBlock.message.body.eth1Data.depositCount),
      this.proposerSlashing.batchRemove(signedBlock.message.body.proposerSlashings),
      this.attesterSlashing.batchRemove(signedBlock.message.body.attesterSlashings),
      this.aggregateAndProof.removeIncluded(signedBlock.message.body.attestations),
    ]);
  }

  public async stop(): Promise<void> {
    await super.stop();
    this.stateCache.clear();
  }
}
