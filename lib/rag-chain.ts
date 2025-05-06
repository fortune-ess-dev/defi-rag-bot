import { ChatAnthropic } from '@langchain/anthropic';
import { RunnableSequence } from '@langchain/core/runnables';
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import { 
  fetchProtocolTVL, 
  fetchTopProtocols, 
  fetchProtocolYields, 
  fetchChains 
} from './defillama';

// Initialize LLM
const llm = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20240620',
  temperature: 0.2
});

// Setup conversation memory
const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: "history",
});

// Create the conversation chain with memory
const conversationChain = new ConversationChain({
  llm,
  memory
});

interface QueryDetails {
  intent: 'protocol_info' | 'tvl_check' | 'yield_info' | 'comparison' | 'chain_info' | 'general_question';
  protocols: string[];
  chains: string[];
  metrics: string[];
}

interface RagInput {
  query: string;
  history?: Array<{ role: string; content: string }>;
}

interface FetchedData {
  protocolsData: Record<string, any>;
  topProtocols: any[];
  chainsData: any[];
  yieldsData: any[];
}

// Helper function to extract intent and entities
async function extractQueryDetails(query: string): Promise<QueryDetails> {
  const extractorPrompt = `
    Extract information from this DeFi query: "${query}"
    
    Return as JSON with these fields:
    - intent: One of [protocol_info, tvl_check, yield_info, comparison, chain_info, general_question]
    - protocols: Array of protocol names mentioned (lowercase, e.g. ["aave", "compound"])
    - chains: Array of blockchain names mentioned (lowercase, e.g. ["ethereum", "polygon"])
    - metrics: Array of metrics mentioned (e.g. ["tvl", "yield", "apy"])
    
    Return ONLY valid JSON, no explanations.
  `;

  try {
    const { content } = await llm.invoke(extractorPrompt);
    return JSON.parse(content as string) as QueryDetails;
  } catch (error) {
    console.error("Error parsing query:", error);
    return {
      intent: "general_question",
      protocols: [],
      chains: [],
      metrics: []
    };
  }
}

// Function to fetch relevant data based on query analysis
async function fetchRelevantData(queryDetails: QueryDetails): Promise<FetchedData> {
  const data: FetchedData = {
    protocolsData: {},
    topProtocols: [],
    chainsData: [],
    yieldsData: []
  };

  // Fetch protocol-specific data
  if (queryDetails.protocols.length > 0) {
    for (const protocol of queryDetails.protocols) {
      data.protocolsData[protocol] = await fetchProtocolTVL(protocol);
      
      if (queryDetails.metrics.includes('yield') || queryDetails.metrics.includes('apy')) {
        data.yieldsData = await fetchProtocolYields(protocol);
      }
    }
  }
  
  // Fetch general data based on intent
  if (queryDetails.intent === 'comparison' && queryDetails.protocols.length > 1) {
    // Data already fetched in the protocols loop
  } else if (queryDetails.intent === 'general_question' || queryDetails.protocols.length === 0) {
    data.topProtocols = await fetchTopProtocols();
    data.topProtocols = data.topProtocols.slice(0, 5); // Limit to top 5
  }

  // Fetch chain data if needed
  if (queryDetails.chains.length > 0 || queryDetails.intent === 'chain_info') {
    data.chainsData = await fetchChains();
  }

  return data;
}

// Function to format data into a readable context
function formatContext(queryDetails: QueryDetails, data: FetchedData): string {
  let context = '';

  // Format protocol data
  for (const [protocol, protocolData] of Object.entries(data.protocolsData)) {
    if (protocolData) {
      context += `Protocol: ${protocol}\n`;
      context += `TVL: $${protocolData.tvl?.toLocaleString() || 'N/A'}\n`;
      context += `Chain: ${protocolData.chain || 'Multiple'}\n\n`;
    }
  }

  // Format yields data
  if (data.yieldsData.length > 0) {
    context += "Yields Information:\n";
    data.yieldsData.slice(0, 3).forEach(yieldData => {
      context += `- Pool: ${yieldData.pool}\n`;
      context += `  APY: ${yieldData.apy.toFixed(2)}%\n`;
      context += `  Chain: ${yieldData.chain}\n\n`;
    });
  }

  // Format top protocols if needed
  if (data.topProtocols.length > 0) {
    context += "Top Protocols by TVL:\n";
    data.topProtocols.forEach((protocol, i) => {
      context += `${i+1}. ${protocol.name}: $${protocol.tvl?.toLocaleString() || 'N/A'}\n`;
    });
    context += '\n';
  }

  // If no specific data was found
  if (context === '') {
    context = "No specific DeFi data found for the query.";
  }

  return context;
}

interface ProcessedInput {
  queryDetails: QueryDetails;
  originalQuery: string;
  conversationHistory: Array<{ role: string; content: string }>;
}

interface ProcessedData {
  context: string;
  query: string;
  conversationHistory: Array<{ role: string; content: string }>;
  queryDetails: QueryDetails;
}

interface RagOutput {
  result: string;
}

// Create RAG pipeline
export const ragChain = RunnableSequence.from([
  // Step 1: Extract query details
  async (input: RagInput): Promise<ProcessedInput> => {
    const queryDetails = await extractQueryDetails(input.query);
    return {
      queryDetails,
      originalQuery: input.query,
      conversationHistory: input.history || []
    };
  },
  
  // Step 2: Fetch relevant data
  async (input: ProcessedInput): Promise<ProcessedData> => {
    const data = await fetchRelevantData(input.queryDetails);
    const context = formatContext(input.queryDetails, data);
    
    return {
      context,
      query: input.originalQuery,
      conversationHistory: input.conversationHistory,
      queryDetails: input.queryDetails
    };
  },
  
  // Step 3: Generate final answer
  async (input: ProcessedData): Promise<RagOutput> => {
    const responsePrompt = `
      You are a DeFi expert assistant. Answer the user's question based on this context:
      
      ${input.context}
      
      User question: ${input.query}
      
      Answer in a concise, helpful way. If you don't have enough data to answer accurately, acknowledge that and provide general information instead. Use numbers and percentages when available.
      
      Response:
    `;
    
    // Save conversation history
    await memory.saveContext(
      { input: input.query },
      { output: input.context }
    );
    
    const { content } = await llm.invoke(responsePrompt);
    return { result: content as string };
  }
]);