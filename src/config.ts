/** Single source of truth for network-specific values. Nothing else in the app hardcodes these. */
export interface NetworkConfig {
  id: "alphanet" | "betanet";
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  walletUrl: string;
  faucetUrl: string;
}

export const NETWORKS: Record<NetworkConfig["id"], NetworkConfig> = {
  alphanet: {
    id: "alphanet",
    name: "Alphanet",
    chainId: 1,
    rpcUrl: "https://rpc.alphanet.thru.org",
    explorerUrl: "https://scan.thru.org",
    walletUrl: "https://app.tid.sh/embedded",
    faucetUrl: "https://dev.thru.org/faucet",
  },
  betanet: {
    id: "betanet",
    name: "Betanet",
    chainId: 2,
    rpcUrl: "https://rpc.betanet.thru.org",
    explorerUrl: "https://scan.thru.org",
    walletUrl: "https://app.tid.sh/embedded",
    faucetUrl: "https://dev.thru.org/faucet",
  },
};

const requested = import.meta.env.VITE_WAYPOINT_NETWORK as string | undefined;
export const NETWORK: NetworkConfig = NETWORKS[requested === "betanet" ? "betanet" : "alphanet"];

export const SITE = {
  name: "Waypoint",
  disclaimer: "Unofficial community project. Not affiliated with Unto Labs or Thru.",
  repoUrl: "https://github.com/",
};
