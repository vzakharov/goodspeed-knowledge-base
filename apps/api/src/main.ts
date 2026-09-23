import { Logger } from '@nestjs/common';

import { createApp } from './app.ts';
import { loadConfig } from './config/env.ts';

const config = loadConfig(process.env);
const app = await createApp(config);

await app.listen(config.port);

new Logger('Bootstrap').log(
  `Listening on http://localhost:${config.port} — chat: ${config.chat.provider}/${config.chat.model}, embeddings: ${config.embedding.provider}/${config.embedding.model}`,
);
