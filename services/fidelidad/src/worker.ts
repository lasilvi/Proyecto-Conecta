import { workerConNeon } from '@comacita/core/worker';
import { crearAppFidelidad } from './app.js';

export default workerConNeon(crearAppFidelidad);
