const { EModelEndpoint } = require('librechat-data-provider');
const { getUserKey, checkUserKeyExpiry } = require('~/server/services/UserService');
const { AnthropicClient } = require('~/app');

const initializeClient = async ({ req, res, endpointOption }) => {
  const { ANTHROPIC_API_KEY, ANTHROPIC_REVERSE_PROXY, PROXY } = process.env;
  const expiresAt = req.body.key;
  const isUserProvided = ANTHROPIC_API_KEY === 'user_provided';

  const anthropicApiKey = isUserProvided
    ? await getAnthropicUserKey(req.user.id)
    : ANTHROPIC_API_KEY;

  if (expiresAt && isUserProvided) {
    checkUserKeyExpiry(expiresAt, EModelEndpoint.anthropic);
  }

  const client = new AnthropicClient(anthropicApiKey, {
    req,
    res,
    reverseProxyUrl: ANTHROPIC_REVERSE_PROXY ?? null,
    proxy: PROXY ?? null,
    ...endpointOption,
  });

  return {
    client,
    anthropicApiKey,
  };
};

const getAnthropicUserKey = async (userId) => {
  return await getUserKey({ userId, name: 'anthropic' });
};

module.exports = initializeClient;
