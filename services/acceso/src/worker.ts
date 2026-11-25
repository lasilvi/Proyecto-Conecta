import { workerConNeon } from '@comacita/core/worker';
import { crearAppAcceso } from './app.js';

export default workerConNeon(crearAppAcceso);
