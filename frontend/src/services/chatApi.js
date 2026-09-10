import axios from 'axios';

const aiServiceUrl = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001';

/**
 * Sends a chat message to the FastAPI AI microservice.
 * Note: We use a vanilla axios call to avoid the global axiosInstance interceptors,
 * ensuring no Authorization header is sent directly to the FastAPI microservice.
 *
 * @param {Object} params
 * @param {string} params.question - The current user question
 * @param {number|null} params.tenantId - The tenant ID or null
 * @param {Array} params.history - The list of historical Q&A pairs (excluding welcome and errors)
 * @param {AbortSignal} [params.signal] - Abort controller signal for cancellation
 * @returns {Promise<{answer: string, retrievedContext: string}>}
 */
export const sendChatMessage = async ({ question, tenantId, history, isPublic, signal }) => {
  try {
    const response = await axios.post(
      `${aiServiceUrl}/chat`,
      {
        question,
        tenant_id: tenantId ?? null,
        history: history ?? [],
        is_public: !!isPublic,
      },
      {
        timeout: 20000, // 20 seconds timeout
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;
    if (!data || typeof data.answer !== 'string') {
      throw new Error('Malformed response: answer field is missing or invalid.');
    }

    return {
      answer: data.answer,
      retrievedContext: data.retrieved_context ?? "",
    };
  } catch (error) {
    if (axios.isCancel(error)) {
      throw { type: 'CANCEL', message: 'Request was cancelled.' };
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw { type: 'TIMEOUT', message: 'The AI is taking too long to respond. Please try again.' };
    }
    if (!error.response) {
      throw { type: 'NETWORK', message: 'Something went wrong, please try again.' };
    }
    throw { 
      type: 'HTTP', 
      status: error.response.status, 
      message: 'Something went wrong, please try again.' 
    };
  }
};
