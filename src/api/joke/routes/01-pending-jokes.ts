
export default {
    routes: [
      { // Path defined with a URL parameter
        method: 'GET',
        path: '/jokes/pending',
        handler: 'joke.getPendingJokes',
      }
    ]
  }