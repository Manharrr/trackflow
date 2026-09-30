import axios from 'axios';

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  'https://api.manhargurukkal.site';

/**
 * Sends a chat message to the Django backend.
 *
 * Production flow:
 * Frontend → Django /api/chatbot/ → FastAPI AI service
 *
 * The FastAPI AI service is kept private and is NOT called directly
 * from the browser.
 *
 * @param {Object} params
 * @param {string} params.question - The current user question
 * @param {number|null} params.tenantId - The tenant ID or null
 * @param {Array} params.history - The list of historical Q&A pairs
 * @param {boolean} params.isPublic - Whether the request is from a public page
 * @param {AbortSignal} [params.signal] - Abort controller signal
 * @returns {Promise<{answer: string, retrievedContext: string}>}
 */
export const sendChatMessage = async ({
  question,
  tenantId,
  history,
  isPublic,
  signal,
}) => {
  try {
    const response = await axios.post(
      `${apiBaseUrl}/api/chatbot/`,
      {
        question,
        tenant_id: tenantId ?? null,
        history: history ?? [],
        is_public: !!isPublic,
      },
      {
        timeout: 20000,
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;

    if (!data || typeof data.answer !== 'string') {
      throw new Error(
        'Malformed response: answer field is missing or invalid.'
      );
    }

    return {
      answer: data.answer,
      retrievedContext: data.retrieved_context ?? '',
    };
  } catch (error) {
    if (axios.isCancel(error)) {
      throw {
        type: 'CANCEL',
        message: 'Request was cancelled.',
      };
    }

    if (
      error.code === 'ECONNABORTED' ||
      error.message?.includes('timeout')
    ) {
      throw {
        type: 'TIMEOUT',
        message: 'The AI is taking too long to respond. Please try again.',
      };
    }

    if (!error.response) {
      throw {
        type: 'NETWORK',
        message: 'Something went wrong, please try again.',
      };
    }

    throw {
      type: 'HTTP',
      status: error.response.status,
      message: 'Something went wrong, please try again.',
    };
  }
};