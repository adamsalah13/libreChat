const { GraphEvents, ToolEndHandler, ChatModelStreamHandler } = require('@librechat/agents');

/** @typedef {import('@librechat/agents').EventHandler} EventHandler */
/** @typedef {import('@librechat/agents').ChatModelStreamHandler} ChatModelStreamHandler */
/** @typedef {import('@librechat/agents').ContentAggregatorResult['aggregateContent']} ContentAggregator */
/** @typedef {import('@librechat/agents').GraphEvents} GraphEvents */

/**
 * Sends message data in Server Sent Events format.
 * @param {ServerResponse} res - The server response.
 * @param {{ data: string | Record<string, unknown>, event?: string }} event - The message event.
 * @param {string} event.event - The type of event.
 * @param {string} event.data - The message to be sent.
 */
const sendEvent = (res, event) => {
  if (typeof event.data === 'string' && event.data.length === 0) {
    return;
  }
  res.write(`event: message\ndata: ${JSON.stringify(event)}\n\n`);
};

/**
 * Get default handlers for stream events.
 * @param {Object} options - The options object.
 * @param {ServerResponse} options.res - The options object.
 * @param {ContentAggregator} options.aggregateContent - The options object.
 * @returns {Record<string, t.EventHandler>} The default handlers.
 * @throws {Error} If the request is not found.
 */
function getDefaultHandlers({ res, aggregateContent }) {
  if (!res || !aggregateContent) {
    throw new Error(
      `[getDefaultHandlers] Missing required options: res: ${!res}, aggregateContent: ${!aggregateContent}`,
    );
  }
  const handlers = {
    // [GraphEvents.CHAT_MODEL_END]: new ModelEndHandler(),
    [GraphEvents.TOOL_END]: new ToolEndHandler(),
    [GraphEvents.CHAT_MODEL_STREAM]: new ChatModelStreamHandler(),
    [GraphEvents.ON_RUN_STEP]: {
      /**
       * Handle ON_RUN_STEP event.
       * @param {string} event - The event name.
       * @param {StreamEventData} data - The event data.
       */
      handle: (event, data) => {
        sendEvent(res, { event, data });
        aggregateContent({ event, data });
      },
    },
    [GraphEvents.ON_RUN_STEP_DELTA]: {
      /**
       * Handle ON_RUN_STEP_DELTA event.
       * @param {string} event - The event name.
       * @param {StreamEventData} data - The event data.
       */
      handle: (event, data) => {
        sendEvent(res, { event, data });
        aggregateContent({ event, data });
      },
    },
    [GraphEvents.ON_RUN_STEP_COMPLETED]: {
      /**
       * Handle ON_RUN_STEP_COMPLETED event.
       * @param {string} event - The event name.
       * @param {StreamEventData & { result: ToolEndData }} data - The event data.
       */
      handle: (event, data) => {
        sendEvent(res, { event, data });
        aggregateContent({ event, data });
      },
    },
    [GraphEvents.ON_MESSAGE_DELTA]: {
      /**
       * Handle ON_MESSAGE_DELTA event.
       * @param {string} event - The event name.
       * @param {StreamEventData} data - The event data.
       */
      handle: (event, data) => {
        sendEvent(res, { event, data });
        aggregateContent({ event, data });
      },
    },
  };

  return handlers;
}

module.exports = {
  sendEvent,
  getDefaultHandlers,
};