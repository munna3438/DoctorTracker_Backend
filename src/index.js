import app from './app.js';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';

async function start() {
  try {
    await connectDB(config.mongoUri);
    app.listen(config.port, () => {
      console.log(`API ready on http://localhost:${config.port} (${config.env})`);
    });
  } catch (err) {
    console.error('Could not start server:', err.message);
    process.exit(1);
  }
}

start();
