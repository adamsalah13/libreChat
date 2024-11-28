const fs = require('fs');
const { FilePurpose } = require('librechat-data-provider');
const { sleep } = require('~/server/utils');
const { logger } = require('~/config');
const OllamaClient = require('ollama-client'); // Import Ollama client

async function uploadOllamaFile({ req, file, ollama }) {
  const { height, width } = req.body;
  const isImage = height && width;
  const uploadedFile = await ollama.files.create({
    file: fs.createReadStream(file.path),
    purpose: isImage ? FilePurpose.Vision : FilePurpose.Assistants,
  });

  logger.debug(
    `[uploadOllamaFile] User ${req.user.id} successfully uploaded file to Ollama`,
    uploadedFile,
  );

  if (uploadedFile.status !== 'processed') {
    const sleepTime = 2500;
    logger.debug(
      `[uploadOllamaFile] File ${
        uploadedFile.id
      } is not yet processed. Waiting for it to be processed (${sleepTime / 1000}s)...`,
    );
    await sleep(sleepTime);
  }

  return isImage ? { ...uploadedFile, height, width } : uploadedFile;
}

async function deleteOllamaFile(req, file, ollama) {
  try {
    const res = await ollama.files.del(file.file_id);
    if (!res.deleted) {
      throw new Error('Ollama returned `false` for deleted status');
    }
    logger.debug(
      `[deleteOllamaFile] User ${req.user.id} successfully deleted ${file.file_id} from Ollama`,
    );
  } catch (error) {
    logger.error('[deleteOllamaFile] Error deleting file from Ollama: ' + error.message);
    throw error;
  }
}

async function getOllamaFileStream(file_id, ollama) {
  try {
    return await ollama.files.content(file_id);
  } catch (error) {
    logger.error('Error getting Ollama file download stream:', error);
    throw error;
  }
}

module.exports = { uploadOllamaFile, deleteOllamaFile, getOllamaFileStream };
