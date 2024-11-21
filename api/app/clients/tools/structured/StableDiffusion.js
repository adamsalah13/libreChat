// Generates image using stable diffusion webui's api (automatic1111)
const fs = require('fs');
const { z } = require('zod');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { Tool } = require('@langchain/core/tools');
const { FileContext } = require('librechat-data-provider');
const getCustomConfig = require('~/server/services/Config/getCustomConfig');
const paths = require('~/config/paths');
const { logger } = require('~/config');

class StableDiffusionAPI extends Tool {
  constructor(fields) {
    super();
    /** @type {string} User ID */
    this.userId = fields.userId;
    /** @type {Express.Request | undefined} Express Request object, only provided by ToolService */
    this.req = fields.req;
    /** @type {boolean} Used to initialize the Tool without necessary variables. */
    this.override = fields.override ?? false;
    /** @type {boolean} Necessary for output to contain all image metadata. */
    this.returnMetadata = fields.returnMetadata ?? false;
    if (fields.uploadImageBuffer) {
      /** @type {uploadImageBuffer} Necessary for output to contain all image metadata. */
      this.uploadImageBuffer = fields.uploadImageBuffer.bind(this);
    }

    this.name = 'stable-diffusion';
    this.url = fields.SD_WEBUI_URL || this.getServerURL();
    this.spec = fields.spec;
    this.description_for_model = `// Generate images and visuals using text.
// Guidelines:
// - ALWAYS use {{"prompt": "7+ detailed keywords", "negative_prompt": "7+ detailed keywords"}} structure for queries.
// - ALWAYS include the markdown url in your final response to show the user: ![caption](/images/id.png)
// - Visually describe the moods, details, structures, styles, and/or proportions of the image. Remember, the focus is on visual attributes.
// - Craft your input by "showing" and not "telling" the imagery. Think in terms of what you'd want to see in a photograph or a painting.
// - Here's an example for generating a realistic portrait photo of a man:
// "prompt":"photo of a man in black clothes, half body, high detailed skin, coastline, overcast weather, wind, waves, 8k uhd, dslr, soft lighting, high quality, film grain, Fujifilm XT3"
// "negative_prompt":"semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime, out of frame, low quality, ugly, mutation, deformed"
// - Generate images only once per human query unless explicitly requested by the user`;
    this.description =
      'You can generate images using text with \'stable-diffusion\'. This tool is exclusively for visual content.';
    this.schema = z.object({
      prompt: z
        .string()
        .describe(
          'Detailed keywords to describe the subject, using at least 7 keywords to accurately describe the image, separated by comma',
        ),
      negative_prompt: z
        .string()
        .describe(
          'Keywords we want to exclude from the final image, using at least 7 keywords to accurately describe the image, separated by comma',
        ),
    });
  }

  replaceNewLinesWithSpaces(inputString) {
    return inputString.replace(/\r\n|\r|\n/g, ' ');
  }

  getMarkdownImageUrl(imageName) {
    const imageUrl = path
      .join(this.relativePath, this.userId, imageName)
      .replace(/\\/g, '/')
      .replace('public/', '');
    return `![generated image](/${imageUrl})`;
  }

  getServerURL() {
    const url = process.env.SD_WEBUI_URL || '';
    if (!url && !this.override) {
      throw new Error('Missing SD_WEBUI_URL environment variable.');
    }
    return url;
  }

  async _call(data) {
    const spec = this.spec;
    const { prompt, negative_prompt } = data;
    const customConfig = await getCustomConfig();
    const sdConfig = customConfig.tools.stableDiffusion.find(item => item.specs.includes(spec));
    const url = sdConfig.WebUI ? sdConfig.WebUI : this.url;
    const payload = {
      prompt,
      negative_prompt,
      cfg_scale: 4.5,
      steps: 22,
      width: 1024,
      height: 1024,
    };
    for (const parameter of Object.keys(sdConfig.parameters)) {
      payload[parameter] = sdConfig.parameters[parameter];
    }
    logger.debug('[Stable Diffusion] name:',sdConfig.name);
    logger.debug('[Stable Diffusion] url:',url);
    logger.debug('[Stable Diffusion] spec:',spec);
    logger.debug('[Stable Diffusion] payload:',payload);

    let generationResponse;
    try {
      generationResponse = await axios.post(`${url}/sdapi/v1/txt2img`, payload);
    } catch (error) {
      logger.error('[StableDiffusion] Error while generating image:', error);
      return 'Error making API request.';
    }
    const image = generationResponse.data.images[0];

    /** @type {{ height: number, width: number, seed: number, infotexts: string[] }} */
    let info = {};
    try {
      info = JSON.parse(generationResponse.data.info);
    } catch (error) {
      logger.error('[StableDiffusion] Error while getting image metadata:', error);
    }

    const file_id = uuidv4();
    const imageName = `${file_id}.png`;
    const { imageOutput: imageOutputPath, clientPath } = paths;
    const filepath = path.join(imageOutputPath, this.userId, imageName);
    this.relativePath = path.relative(clientPath, imageOutputPath);

    if (!fs.existsSync(path.join(imageOutputPath, this.userId))) {
      fs.mkdirSync(path.join(imageOutputPath, this.userId), { recursive: true });
    }

    try {
      const buffer = Buffer.from(image.split(',', 1)[0], 'base64');
      if (this.returnMetadata && this.uploadImageBuffer && this.req) {
        const file = await this.uploadImageBuffer({
          req: this.req,
          context: FileContext.image_generation,
          resize: false,
          metadata: {
            buffer,
            height: info.height,
            width: info.width,
            bytes: Buffer.byteLength(buffer),
            filename: imageName,
            type: 'image/png',
            file_id,
          },
        });

        const generationInfo = info.infotexts[0].split('\n').pop();
        return {
          ...file,
          prompt,
          metadata: {
            negative_prompt,
            seed: info.seed,
            info: generationInfo,
          },
        };
      }

      await sharp(buffer)
        .withMetadata({
          iptcpng: {
            parameters: info.infotexts[0],
          },
        })
        .toFile(filepath);
      this.result = this.getMarkdownImageUrl(imageName);
    } catch (error) {
      logger.error('[StableDiffusion] Error while saving the image:', error);
    }

    return this.result;
  }
}

module.exports = StableDiffusionAPI;
