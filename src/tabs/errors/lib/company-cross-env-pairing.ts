import type { Company, CompanyPairingMethod } from "../types";
import { companyCrossEnvKey } from "./discrepancy";
import { collectStrongReportIdentityKeysForCompany } from "./cross-env-report-shell";

export type PairedCompanyLookup = {
  stageMap: Map<string, Company>;
  prodMap: Map<string, Company>;
  pairingMethods: Map<string, CompanyPairingMethod>;
};

type Env = "stage" | "prod";
type NodeId = `${Env}\0${string}`;

function nodeId(env: Env, company: Company): NodeId {
  return `${env}\0${companyCrossEnvKey(company)}`;
}

class UnionFind {
  private parent = new Map<NodeId, NodeId>();

  add(id: NodeId): void {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: NodeId): NodeId {
    const parent = this.parent.get(id);
    if (!parent) throw new Error(`Unknown union-find node: ${id}`);
    if (parent !== id) {
      const root = this.find(parent);
      this.parent.set(id, root);
      return root;
    }
    return id;
  }

  union(a: NodeId, b: NodeId): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootA, rootB);
  }

  groups(): Map<NodeId, NodeId[]> {
    const byRoot = new Map<NodeId, NodeId[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      const bucket = byRoot.get(root) ?? [];
      bucket.push(id);
      byRoot.set(root, bucket);
    }
    return byRoot;
  }
}

type CompanyNode = {
  env: Env;
  company: Company;
  primaryKey: string;
};

function pickUnifiedKey(
  members: CompanyNode[],
  reportIdentityKey: string | null,
): string {
  const wikidataId = members
    .map((member) => member.company.wikidataId?.trim())
    .find(Boolean);
  if (wikidataId) return wikidataId;
  if (reportIdentityKey) return `report:${reportIdentityKey}`;
  return members[0]?.primaryKey ?? "unknown";
}

function pairingMethodForGroup(
  members: CompanyNode[],
  unitedByReportIdentity: boolean,
): CompanyPairingMethod {
  const hasStage = members.some((member) => member.env === "stage");
  const hasProd = members.some((member) => member.env === "prod");
  if (!hasStage || !hasProd) return "unpaired";

  const stageWikidata = members
    .find((member) => member.env === "stage")
    ?.company.wikidataId?.trim();
  const prodWikidata = members
    .find((member) => member.env === "prod")
    ?.company.wikidataId?.trim();

  if (stageWikidata && prodWikidata && stageWikidata === prodWikidata) {
    return "wikidata";
  }
  if (unitedByReportIdentity) return "report-identity";
  return "unpaired";
}

/**
 * Pair companies across stage and prod by wikidataId, then by unique shared
 * report sha256 / URL when wikidata pairing is unavailable.
 */
export function buildPairedCompanyMaps(
  stageCompanies: Company[],
  prodCompanies: Company[],
): PairedCompanyLookup {
  const uf = new UnionFind();
  const nodesById = new Map<NodeId, CompanyNode>();

  const register = (env: Env, company: Company) => {
    const id = nodeId(env, company);
    uf.add(id);
    nodesById.set(id, {
      env,
      company,
      primaryKey: companyCrossEnvKey(company),
    });
  };

  stageCompanies.forEach((company) => register("stage", company));
  prodCompanies.forEach((company) => register("prod", company));

  const stageByWikidata = new Map<string, NodeId>();
  const prodByWikidata = new Map<string, NodeId>();
  for (const [id, node] of nodesById) {
    const wikidataId = node.company.wikidataId?.trim();
    if (!wikidataId) continue;
    if (node.env === "stage") stageByWikidata.set(wikidataId, id);
    else prodByWikidata.set(wikidataId, id);
  }

  for (const [wikidataId, stageNode] of stageByWikidata) {
    const prodNode = prodByWikidata.get(wikidataId);
    if (prodNode) uf.union(stageNode, prodNode);
  }

  const identityToStage = new Map<string, NodeId[]>();
  const identityToProd = new Map<string, NodeId[]>();
  const reportIdentityByNode = new Map<NodeId, Set<string>>();

  const indexIdentities = (env: Env, company: Company) => {
    const id = nodeId(env, company);
    const keys = collectStrongReportIdentityKeysForCompany(company);
    reportIdentityByNode.set(id, keys);
    const bucket = env === "stage" ? identityToStage : identityToProd;
    for (const key of keys) {
      const list = bucket.get(key) ?? [];
      list.push(id);
      bucket.set(key, list);
    }
  };

  stageCompanies.forEach((company) => indexIdentities("stage", company));
  prodCompanies.forEach((company) => indexIdentities("prod", company));

  const unitedIdentityByRoot = new Map<NodeId, string>();

  for (const [identityKey, stageNodes] of identityToStage) {
    const prodNodes = identityToProd.get(identityKey);
    if (!prodNodes || stageNodes.length !== 1 || prodNodes.length !== 1) {
      continue;
    }
    const stageNode = stageNodes[0]!;
    const prodNode = prodNodes[0]!;
    if (uf.find(stageNode) === uf.find(prodNode)) continue;
    uf.union(stageNode, prodNode);
    const root = uf.find(stageNode);
    unitedIdentityByRoot.set(root, identityKey);
  }

  const stageMap = new Map<string, Company>();
  const prodMap = new Map<string, Company>();
  const pairingMethods = new Map<string, CompanyPairingMethod>();

  for (const memberIds of uf.groups().values()) {
    const members = memberIds
      .map((id) => nodesById.get(id))
      .filter((node): node is CompanyNode => node != null);

    const root = memberIds[0] ? uf.find(memberIds[0]) : null;
    const reportIdentityKey = (root && unitedIdentityByRoot.get(root)) ?? null;
    const unifiedKey = pickUnifiedKey(members, reportIdentityKey);
    const method = pairingMethodForGroup(members, reportIdentityKey != null);

    const stageMember = members.find((member) => member.env === "stage");
    const prodMember = members.find((member) => member.env === "prod");

    if (stageMember) stageMap.set(unifiedKey, stageMember.company);
    if (prodMember) prodMap.set(unifiedKey, prodMember.company);
    if (stageMember || prodMember) {
      pairingMethods.set(unifiedKey, method);
    }
  }

  return { stageMap, prodMap, pairingMethods };
}
