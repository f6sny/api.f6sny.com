export default {
    routes: [
        {
            method: 'GET',
            path: '/globalcall/counters',
            handler: 'globalcall.getCounters',
            config: {
                policies: [],
                auth: false
            }
        },
        {
            method: 'GET',
            path: '/globalcall/latest-comments',
            handler: 'globalcall.getLatestComments',
            config: {
                policies: [],
                auth: false
            }
        }
    ]
};