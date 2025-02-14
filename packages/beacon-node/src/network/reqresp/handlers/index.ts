import {ProtocolHandler} from "@lodestar/reqresp";
import {ssz} from "@lodestar/types";
import {IBeaconChain} from "../../../chain/index.js";
import {IBeaconDb} from "../../../db/index.js";
import {BlobSidecarsByRootRequestType} from "../../../util/types.js";
import {GetReqRespHandlerFn, ReqRespMethod} from "../types.js";
import {onBeaconBlocksByRange} from "./beaconBlocksByRange.js";
import {onBeaconBlocksByRoot} from "./beaconBlocksByRoot.js";
import {onBlobSidecarsByRange} from "./blobSidecarsByRange.js";
import {onBlobSidecarsByRoot} from "./blobSidecarsByRoot.js";
import {onLightClientBootstrap} from "./lightClientBootstrap.js";
import {onLightClientFinalityUpdate} from "./lightClientFinalityUpdate.js";
import {onLightClientOptimisticUpdate} from "./lightClientOptimisticUpdate.js";
import {onLightClientUpdatesByRange} from "./lightClientUpdatesByRange.js";

function notImplemented(method: ReqRespMethod): ProtocolHandler {
  return () => {
    throw Error(`Handler not implemented for ${method}`);
  };
}

/**
 * The ReqRespHandler module handles app-level requests / responses from other peers,
 * fetching state from the chain and database as needed.
 */
export function getReqRespHandlers({db, chain}: {db: IBeaconDb; chain: IBeaconChain}): GetReqRespHandlerFn {
  const handlers: Record<ReqRespMethod, ProtocolHandler> = {
    [ReqRespMethod.Status]: notImplemented(ReqRespMethod.Status),
    [ReqRespMethod.Goodbye]: notImplemented(ReqRespMethod.Goodbye),
    [ReqRespMethod.Ping]: notImplemented(ReqRespMethod.Ping),
    [ReqRespMethod.Metadata]: notImplemented(ReqRespMethod.Metadata),
    [ReqRespMethod.BeaconBlocksByRange]: (req) => {
      const body = ssz.phase0.BeaconBlocksByRangeRequest.deserialize(req.data);
      return onBeaconBlocksByRange(body, chain, db);
    },
    [ReqRespMethod.BeaconBlocksByRoot]: (req) => {
      const body = ssz.phase0.BeaconBlocksByRootRequest.deserialize(req.data);
      return onBeaconBlocksByRoot(body, chain, db);
    },
    [ReqRespMethod.BlobSidecarsByRoot]: (req) => {
      const body = BlobSidecarsByRootRequestType(chain.config).deserialize(req.data);
      return onBlobSidecarsByRoot(body, chain, db);
    },
    [ReqRespMethod.BlobSidecarsByRange]: (req) => {
      const body = ssz.deneb.BlobSidecarsByRangeRequest.deserialize(req.data);
      return onBlobSidecarsByRange(body, chain, db);
    },
    [ReqRespMethod.LightClientBootstrap]: (req) => {
      const body = ssz.Root.deserialize(req.data);
      return onLightClientBootstrap(body, chain);
    },
    [ReqRespMethod.LightClientUpdatesByRange]: (req) => {
      const body = ssz.altair.LightClientUpdatesByRange.deserialize(req.data);
      return onLightClientUpdatesByRange(body, chain);
    },
    [ReqRespMethod.LightClientFinalityUpdate]: () => onLightClientFinalityUpdate(chain),
    [ReqRespMethod.LightClientOptimisticUpdate]: () => onLightClientOptimisticUpdate(chain),
  };

  return (method) => handlers[method];
}
