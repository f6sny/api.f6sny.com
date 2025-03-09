// create the respective route

export default {
    routes: [
        {
            method: 'PUT',
            path: '/profile/me',
            handler: 'profile.update',
            config: {
                policies: [],
            }
        }
    ]
};
