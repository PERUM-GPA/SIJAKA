import server from '../dist/server.cjs';

const app = (server && (server.default || server.app)) || server;

export default app;
