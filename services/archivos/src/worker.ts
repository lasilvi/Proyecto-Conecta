import { workerConNeon } from '@comacita/core/worker';
import { crearAppArchivos } from './app.js';

export default workerConNeon(crearAppArchivos);
