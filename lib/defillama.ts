import axios from 'axios';

const BASE_URL = 'https://api.llama.fi';

interface ProtocolData {
  name?: string;
  description?: string;
  tvl?: number;
  chain?: string;
  currentChainTvls?: {
    [key: string]: number;
  };
  chains?: string[];
  category?: string;
  url?: string;
}

interface YieldData {
  project: string;
  chain: string;
  pool: string;
  apy: number;
  tvlUsd: number;
  poolMeta?: string;
}

interface ChainData {
  name: string;
  tvl: number;
  tokenSymbol?: string;
  cmcId?: number;
  chainId?: number;
}

export async function fetchProtocolTVL(protocolSlug: string): Promise<ProtocolData | null> {
  try {
    const response = await axios.get(`${BASE_URL}/protocol/${protocolSlug}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching TVL for ${protocolSlug}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function fetchTopProtocols(): Promise<ProtocolData[]> {
  try {
    const response = await axios.get(`${BASE_URL}/protocols`);
    return response.data;
  } catch (error) {
    console.error('Error fetching top protocols:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

export async function fetchYields(): Promise<YieldData[]> {
  try {
    const response = await axios.get(`${BASE_URL}/yields`);
    return response.data;
  } catch (error) {
    console.error('Error fetching yields:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

export async function fetchChains(): Promise<ChainData[]> {
  try {
    const response = await axios.get(`${BASE_URL}/chains`);
    return response.data;
  } catch (error) {
    console.error('Error fetching chains:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

export async function fetchProtocolYields(protocolSlug: string): Promise<YieldData[]> {
  try {
    const allYields = await fetchYields();
    return allYields.filter(yieldData => yieldData.project.toLowerCase() === protocolSlug.toLowerCase());
  } catch (error) {
    console.error(`Error fetching yields for ${protocolSlug}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}