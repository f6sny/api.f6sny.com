/**
 * joke router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::joke.joke');

// Route for voting and findPending