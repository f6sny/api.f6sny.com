module.exports = {
	comments: {
		enableUsers: true,
		badWords: false,
		moderatorRoles: ["Authenticated"],
        relatedContentTypes: {
            jokes: {
              uuid: 'application::jokes.jokes',
              contentManager: true,
              __contentType: '',
              key: 'title',
              value: 'id',
            }
          }
	},
};
