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

/** Mission parameters. Network-specific addresses are optional and the UI asks the user when they are missing. */
export const TRAIL: { transferTarget?: string; transferAmount: bigint; tokenSink?: string; tokenAmount: bigint } = {
  // Alphanet: the faucet vault, so the first transfer is "give a little back". Tested end to end (docs/phase0.md).
  transferTarget: NETWORK.id === "alphanet" ? "taTigKYAf5mNxUNUVXeXq1HQodKc07DBzF4Pl7tCi1iXxt" : undefined,
  transferAmount: 10n,
  // Alphanet: a community sample THRUSD token account on the test network that anyone can send to.
  tokenSink: NETWORK.id === "alphanet" ? "tabrhH7Qem0lmrx8SYATaqL_mkFTK2zC5VOnhwKAkd1rf2" : undefined,
  tokenAmount: 1000n, // 0.001 THRUSD (6 decimals)
};

export const SITE = {
  name: "Waypoint",
  disclaimer: "Unofficial community project. Not affiliated with Unto Labs or Thru.",
  repoUrl: "https://github.com/",
};
