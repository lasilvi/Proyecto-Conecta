import { workerConNeon } from '@comacita/core/worker';
import { crearAppMarcas } from './app.js';

export default workerConNeon(crearAppMarcas);
